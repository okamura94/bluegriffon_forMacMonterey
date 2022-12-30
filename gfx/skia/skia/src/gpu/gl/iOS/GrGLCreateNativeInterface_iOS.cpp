/*
 * Copyright 2014 Google Inc.
 *
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

#include "gl/GrGLInterface.h"
#include "gl/GrGLAssembleInterface.h"
#include <dlfcn.h>

// Add 2-Lines 2022.11
#include "nsCocoaFeatures.h"
#include "mozilla/Sprintf.h"

class GLLoader {
public:
    GLLoader() {

        // Specifying Library Path and Library by OS 2022.11 Start -------------------------------------
        // Get OS Version
        int major, minor, bugfix;
        nsCocoaFeatures::GetSystemVersion(major, minor, bugfix);
        char* kOpenGlLibPathName;                        // OpenGL Library Path & Library Name

        // Default OpenGL Library Path & Library Name Set
        kOpenGlLibPathName = (char*)"/System/Library/Frameworks/OpenGL.framework/OpenGL";
        if (major >= 11) {
           // >= Big Sur Version Lib Path & Lib Name Set
           kOpenGlLibPathName = (char*)"/System/Volumes/Data/usr/local/lib/libGLEW.dylib";
        }
        printf("--------GrGLCreateNativeInterface_iOS.cpp GLLoader() MacOS Version major: %d minor: %d\n", major, minor);
        printf("--------GrGLCreateNativeInterface_iOS.cpp GLLoader() OpenGL Library Path & Library Name: %s\n", kOpenGlLibPathName);
        // Specifying Library Path and Library by OS 2022.11 End ---------------------------------------

        fLibrary = dlopen(
            // Change OpenGL Library Path & Library Name 2022.11
            // "/Volumes/MAC/Versions/A/Libraries/libGL.dylib",
            kOpenGlLibPathName,
            RTLD_LAZY);
    }

    ~GLLoader() {
        if (fLibrary) {
            dlclose(fLibrary);
        }
    }

    void* handle() const {
        return nullptr == fLibrary ? RTLD_DEFAULT : fLibrary;
    }

private:
    void* fLibrary;
};

class GLProcGetter {
public:
    GLProcGetter() {}

    GrGLFuncPtr getProc(const char name[]) const {
        return (GrGLFuncPtr) dlsym(fLoader.handle(), name);
    }

private:
    GLLoader fLoader;
};

static GrGLFuncPtr ios_get_gl_proc(void* ctx, const char name[]) {
    SkASSERT(ctx);
    const GLProcGetter* getter = (const GLProcGetter*) ctx;
    return getter->getProc(name);
}

const GrGLInterface* GrGLCreateNativeInterface() {
    GLProcGetter getter;
    return GrGLAssembleGLESInterface(&getter, ios_get_gl_proc);
}
