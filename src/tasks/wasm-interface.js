const webp_to_canvas = [{
    name :'create_buffer', 
    ret: 'number', 
    args: ['number', 'number']
  }, {
    name: 'encode_jpeg_to_bmp',
    ret: '', 
    args: [ 'number', 'number' ]
  }, {
    name: 'encode_jpeg_to_webp',
    ret: 'number', 
    args: [ 'number', 'number', 'number' ]
  }, {
    name: 'encode_bmp_to_webp',
    ret: 'number', 
    args: [ 'number', 'number', 'number' ]
  }, {
    name: 'create_buffer',
    ret: 'number', 
    args: ['number', 'number' ]
  }, {
    name: 'get_result_pointer',
    ret: 'number', 
    args: [ ]
  }, {
    name: 'get_result_size',
    ret: 'number', 
    args: [ ]
  }, {
    isSetter: 'true',
    name: 'encode_setter',
    type: '8'
  }, {
    isGetter: 'true',
    name: 'encode_getter',
    type: '8',
    returnType: 'U8'
  }, {
    name :'free_result', 
    ret: '', 
    args: ['number']
  }, {
    name :'destroy_buffer', 
    ret: '', 
    args: ['number']
  } ];