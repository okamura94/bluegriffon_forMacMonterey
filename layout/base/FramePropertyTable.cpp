/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FramePropertyTable.h"

#include "mozilla/MemoryReporting.h"
#include "mozilla/ServoStyleSet.h"
#include "nsThreadUtils.h"

namespace mozilla {

void
FramePropertyTable::SetInternal(
  nsIFrame* aFrame, UntypedDescriptor aProperty, void* aValue)
{
  MOZ_ASSERT(NS_IsMainThread());
  NS_ASSERTION(aFrame, "Null frame?");
  NS_ASSERTION(aProperty, "Null property?");

  if (mLastFrame != aFrame || !mLastEntry) {
    mLastFrame = aFrame;
    mLastEntry = mEntries.PutEntry(aFrame);
    aFrame->AddStateBits(NS_FRAME_HAS_PROPERTIES);
  }
  Entry* entry = mLastEntry;

  if (!entry->mProp.IsArray()) {
    if (!entry->mProp.mProperty) {
      // Empty entry, so we can just store our property in the empty slot
      entry->mProp.mProperty = aProperty;
      entry->mProp.mValue = aValue;
      return;
    }
    if (entry->mProp.mProperty == aProperty) {
      // Just overwrite the current value
      entry->mProp.DestroyValueFor(aFrame);
      entry->mProp.mValue = aValue;
      return;
    }

    // We need to expand the single current entry to an array
    PropertyValue current = entry->mProp;
    entry->mProp.mProperty = nullptr;
    static_assert(sizeof(nsTArray<PropertyValue>) <= sizeof(void *),
                  "Property array must fit entirely within entry->mProp.mValue");
    new (&entry->mProp.mValue) nsTArray<PropertyValue>(4);
    entry->mProp.ToArray()->AppendElement(current);
  }

  nsTArray<PropertyValue>* array = entry->mProp.ToArray();
  nsTArray<PropertyValue>::index_type index =
    array->IndexOf(aProperty, 0, PropertyComparator());
  if (index != nsTArray<PropertyValue>::NoIndex) {
    PropertyValue* pv = &array->ElementAt(index);
    pv->DestroyValueFor(aFrame);
    pv->mValue = aValue;
    return;
  }

  array->AppendElement(PropertyValue(aProperty, aValue));
}

void*
FramePropertyTable::GetInternal(
  const nsIFrame* aFrame, UntypedDescriptor aProperty, bool aSkipBitCheck,
  bool* aFoundResult)
{
  NS_ASSERTION(aFrame, "Null frame?");
  NS_ASSERTION(aProperty, "Null property?");

  if (aFoundResult) {
    *aFoundResult = false;
  }

  if (!aSkipBitCheck && !(aFrame->GetStateBits() & NS_FRAME_HAS_PROPERTIES)) {
    return nullptr;
  }

  // We can end up here during parallel style traversal, in which case the main
  // thread is blocked. Reading from the cache is fine on any thread, but we
  // only want to write to it in the main-thread case.
  bool cacheHit = mLastFrame == aFrame;
  Entry* entry = cacheHit ? mLastEntry : mEntries.GetEntry(aFrame);
  if (!cacheHit && !ServoStyleSet::IsInServoTraversal()) {
    mLastFrame = aFrame;
    mLastEntry = entry;
  }

  MOZ_ASSERT(entry || aSkipBitCheck,
             "NS_FRAME_HAS_PROPERTIES bit should match whether entry exists");
  if (!entry)
    return nullptr;

  if (entry->mProp.mProperty == aProperty) {
    if (aFoundResult) {
      *aFoundResult = true;
    }
    return entry->mProp.mValue;
  }
  if (!entry->mProp.IsArray()) {
    // There's just one property and it's not the one we want, bail
    return nullptr;
  }

  nsTArray<PropertyValue>* array = entry->mProp.ToArray();
  nsTArray<PropertyValue>::index_type index =
    array->IndexOf(aProperty, 0, PropertyComparator());
  if (index == nsTArray<PropertyValue>::NoIndex)
    return nullptr;

  if (aFoundResult) {
    *aFoundResult = true;
  }

  return array->ElementAt(index).mValue;
}

void*
FramePropertyTable::RemoveInternal(
  nsIFrame* aFrame, UntypedDescriptor aProperty, bool aSkipBitCheck,
  bool* aFoundResult)
{
  MOZ_ASSERT(NS_IsMainThread());
  NS_ASSERTION(aFrame, "Null frame?");
  NS_ASSERTION(aProperty, "Null property?");

  if (aFoundResult) {
    *aFoundResult = false;
  }

  if (!aSkipBitCheck && !(aFrame->GetStateBits() & NS_FRAME_HAS_PROPERTIES)) {
    return nullptr;
  }

  if (mLastFrame != aFrame) {
    mLastFrame = aFrame;
    mLastEntry = mEntries.GetEntry(aFrame);
  }
  Entry* entry = mLastEntry;
  MOZ_ASSERT(entry || aSkipBitCheck,
             "NS_FRAME_HAS_PROPERTIES bit should match whether entry exists");
  if (!entry)
    return nullptr;

  if (entry->mProp.mProperty == aProperty) {
    // There's only one entry and it's the one we want
    void* value = entry->mProp.mValue;

    // Here it's ok to use RemoveEntry() -- which may resize mEntries --
    // because we null mLastEntry at the same time.
    mEntries.RemoveEntry(entry);
    aFrame->RemoveStateBits(NS_FRAME_HAS_PROPERTIES);
    mLastEntry = nullptr;
    if (aFoundResult) {
      *aFoundResult = true;
    }
    return value;
  }
  if (!entry->mProp.IsArray()) {
    // There's just one property and it's not the one we want, bail
    return nullptr;
  }

  nsTArray<PropertyValue>* array = entry->mProp.ToArray();
  nsTArray<PropertyValue>::index_type index =
    array->IndexOf(aProperty, 0, PropertyComparator());
  if (index == nsTArray<PropertyValue>::NoIndex) {
    // No such property, bail
    return nullptr;
  }

  if (aFoundResult) {
    *aFoundResult = true;
  }

  void* result = array->ElementAt(index).mValue;

  uint32_t last = array->Length() - 1;
  array->ElementAt(index) = array->ElementAt(last);
  array->RemoveElementAt(last);

  if (last == 1) {
    PropertyValue pv = array->ElementAt(0);
    array->~nsTArray<PropertyValue>();
    entry->mProp = pv;
  }
  
  return result;
}

void
FramePropertyTable::DeleteInternal(
  nsIFrame* aFrame, UntypedDescriptor aProperty, bool aSkipBitCheck)
{
  MOZ_ASSERT(NS_IsMainThread());
  NS_ASSERTION(aFrame, "Null frame?");
  NS_ASSERTION(aProperty, "Null property?");

  bool found;
  void* v = RemoveInternal(aFrame, aProperty, aSkipBitCheck, &found);
  if (found) {
    PropertyValue pv(aProperty, v);
    pv.DestroyValueFor(aFrame);
  }
}

/* static */ void
FramePropertyTable::DeleteAllForEntry(Entry* aEntry)
{
  if (!aEntry->mProp.IsArray()) {
    aEntry->mProp.DestroyValueFor(aEntry->GetKey());
    return;
  }

  nsTArray<PropertyValue>* array = aEntry->mProp.ToArray();
  for (uint32_t i = 0; i < array->Length(); ++i) {
    array->ElementAt(i).DestroyValueFor(aEntry->GetKey());
  }
  array->~nsTArray<PropertyValue>();
}

void
FramePropertyTable::DeleteAllFor(nsIFrame* aFrame)
{
  NS_ASSERTION(aFrame, "Null frame?");

  if (!(aFrame->GetStateBits() & NS_FRAME_HAS_PROPERTIES)) {
    return;
  }

  Entry* entry = mEntries.GetEntry(aFrame);
  MOZ_ASSERT(entry,
             "NS_FRAME_HAS_PROPERTIES bit should match whether entry exists");
  if (!entry)
    return;

  if (mLastFrame == aFrame) {
    // Flush cache. We assume DeleteAllForEntry will be called before
    // a frame is destroyed.
    mLastFrame = nullptr;
    mLastEntry = nullptr;
  }

  DeleteAllForEntry(entry);

  // mLastEntry points into mEntries, so we use RawRemoveEntry() which will not
  // resize mEntries.
  mEntries.RawRemoveEntry(entry);

  // Don't bother unsetting NS_FRAME_HAS_PROPERTIES, since aFrame is going away
}

void
FramePropertyTable::DeleteAll()
{
  mLastFrame = nullptr;
  mLastEntry = nullptr;

  for (auto iter = mEntries.Iter(); !iter.Done(); iter.Next()) {
    DeleteAllForEntry(iter.Get());
  }
  mEntries.Clear();
}

size_t
FramePropertyTable::SizeOfExcludingThis(mozilla::MallocSizeOf aMallocSizeOf) const
{
  return mEntries.SizeOfExcludingThis(aMallocSizeOf);
}

} // namespace mozilla
