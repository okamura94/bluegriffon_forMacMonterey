# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Source-test jobs can run on multiple platforms.  These transforms allow jobs
with either `platform` or a list of `platforms`, and set the appropriate
treeherder configuration and attributes for that platform.
"""

from __future__ import absolute_import, print_function, unicode_literals

import copy

from taskgraph.transforms.base import TransformSequence
from taskgraph.transforms.job import job_description_schema
from taskgraph.util.schema import (
    validate_schema,
    resolve_keyed_by,
)
from voluptuous import (
    Any,
    Extra,
    Required,
    Schema,
)

job_description_schema = {str(k): v for k, v in job_description_schema.schema.iteritems()}

source_test_description_schema = Schema({
    # most fields are passed directly through as job fields, and are not
    # repeated here
    Extra: object,

    # The platform on which this task runs.  This will be used to set up attributes
    # (for try selection) and treeherder metadata (for display).  If given as a list,
    # the job will be "split" into multiple tasks, one with each platform.
    Required('platform'): Any(basestring, [basestring]),

    # These fields can be keyed by "platform", and are otherwise identical to
    # job descriptions.
    Required('worker-type'): Any(
        job_description_schema['worker-type'],
        {'by-platform': {basestring: job_description_schema['worker-type']}},
    ),
    Required('worker'): Any(
        job_description_schema['worker'],
        {'by-platform': {basestring: job_description_schema['worker']}},
    ),
})

transforms = TransformSequence()


@transforms.add
def validate(config, jobs):
    for job in jobs:
        yield validate_schema(source_test_description_schema, job,
                              "In job {!r}:".format(job['name']))


@transforms.add
def set_job_try_name(config, jobs):
    for job in jobs:
        job.setdefault('attributes', {}).setdefault('job_try_name', job['name'])
        yield job


@transforms.add
def expand_platforms(config, jobs):
    for job in jobs:
        if isinstance(job['platform'], basestring):
            yield job
            continue

        for platform in job['platform']:
            pjob = copy.deepcopy(job)
            pjob['platform'] = platform

            if 'name' in pjob:
                pjob['name'] = '{}-{}'.format(pjob['name'], platform)
            else:
                pjob['label'] = '{}-{}'.format(pjob['label'], platform)
            yield pjob


@transforms.add
def handle_platform(config, jobs):
    """
    Handle the 'platform' property, setting up treeherder context as well as
    try-related attributes.
    """
    fields = [
        'worker-type',
        'worker',
    ]

    for job in jobs:
        platform = job['platform']

        for field in fields:
            resolve_keyed_by(job, field, item_name=job['name'])

        if 'treeherder' in job:
            job['treeherder']['platform'] = platform

        build_platform, build_type = platform.split('/')

        job['attributes'].update({
            'build_platform': build_platform,
            'build_type': build_type,
        })

        del job['platform']
        yield job
