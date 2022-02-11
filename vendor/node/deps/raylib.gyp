{
  'targets': [
    {
      'target_name': 'raylib',
      'type': 'static_library',
      'defines': [
        'PLATFORM_DESKTOP',
        'PLATFORM=PLATFORM_DESKTOP',
        'GRAPHICS_API_OPENGL_33',
        'GRAPHICS=GRAPHICS_API_OPENGL_33',
        'BUILD_LIBTYPE_SHARED',
        'NDEBUG', # Force disable assertions in GLFW
      ],
      'include_dirs': [
        '../../raylib/src/external/glfw/include',
      ],
      'direct_dependent_settings': {
        'include_dirs': [ '../../raylib/src' ],
      },
      'sources': [
        '../../raylib/src/rcore.c',
        '../../raylib/src/rshapes.c',
        '../../raylib/src/rtextures.c',
        '../../raylib/src/rtext.c',
        '../../raylib/src/rmodels.c',
        '../../raylib/src/utils.c',
        '../../raylib/src/rglfw.c',
        '../../raylib/src/raudio.c',
      ]
    }
  ]
}