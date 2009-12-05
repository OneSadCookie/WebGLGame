width = 1
height = 1

loaded = false
program = null
image = null
textures = {}
images = {}
tilemetrics = null
map = null
drawCommands = []

TEXTURE_FILES = ['tiles']

TILE_WIDTH = 101
TILE_HEIGHT = 171
TILE_GROUND_HEIGHT = 82
TILE_FRONT_HEIGHT = 41
TEXTURE_HEIGHT = 170
HACK_OFFSET = 1

KEY_LEFT = 37
KEY_UP = 38
KEY_RIGHT = 39
KEY_DOWN = 40

function makeBuffer(gl, target, data)
{
    var bo = gl.createBuffer()
    gl.bindBuffer(target, bo)
    gl.bufferData(target, data, gl.STATIC_DRAW)
    return bo
}

function loadPlanes(gl, width, height, planes)
{
    var pos_array = []
    var tc_array = []
    var e_array = []
    
    // TODO multiple planes
    var x = 0
    var y = height - 1
    var ix = 0
    var e_count = 0
    planes[0].each(function (tile) {
        var bx = x + HACK_OFFSET
        var by = y + HACK_OFFSET
        pos_array = pos_array.concat([
            (bx + 0) * TILE_WIDTH, by * TILE_GROUND_HEIGHT,
            (bx + 1) * TILE_WIDTH, by * TILE_GROUND_HEIGHT,
            (bx + 1) * TILE_WIDTH, by * TILE_GROUND_HEIGHT + TILE_HEIGHT,
            (bx + 0) * TILE_WIDTH, by * TILE_GROUND_HEIGHT + TILE_HEIGHT ])
        var m = tilemetrics[tile]
        tc_array = tc_array.concat([
            m.x      , m.y      ,
            m.x + m.w, m.y      ,
            m.x + m.w, m.y + m.h,
            m.x      , m.y + m.h ])
        e_array = e_array.concat([ix + 0, ix + 1, ix + 2, ix + 0, ix + 2, ix + 3])
        ix += 4
        e_count += 6
        
        x += 1
        if (x >= width)
        {
            x = 0
            y -= 1
        }
    })
    
    drawCommands.push({
        'vbo': makeBuffer(
            gl,
            gl.ARRAY_BUFFER,
            new WebGLFloatArray(pos_array.concat(tc_array))),
        'pos_offset': 0,
        'tc_offset': ix * 8,
        'ebo': makeBuffer(
            gl,
            gl.ELEMENT_ARRAY_BUFFER,
            new WebGLUnsignedShortArray(e_array)),
        'count': e_count,
        'texture': textures['tiles'],
        'image': images['tiles'],
        'mode': gl.TRIANGLES
    })
}

function loadScenery(gl, scenery)
{
    var pos_array = []
    var tc_array = []
    var e_array = []
    
    // TODO multiple planes
    var ix = 0
    var e_count = 0
    scenery.each(function (prop) {
        var bx = prop.x + HACK_OFFSET
        var by = prop.y + HACK_OFFSET
        // TODO height
        pos_array = pos_array.concat([
            (bx + 0) * TILE_WIDTH, by * TILE_GROUND_HEIGHT + TILE_FRONT_HEIGHT,
            (bx + 1) * TILE_WIDTH, by * TILE_GROUND_HEIGHT + TILE_FRONT_HEIGHT,
            (bx + 1) * TILE_WIDTH, by * TILE_GROUND_HEIGHT + TILE_FRONT_HEIGHT + TILE_HEIGHT,
            (bx + 0) * TILE_WIDTH, by * TILE_GROUND_HEIGHT + TILE_FRONT_HEIGHT + TILE_HEIGHT ])
        var m = tilemetrics[prop.type]
        tc_array = tc_array.concat([
            m.x      , m.y      ,
            m.x + m.w, m.y      ,
            m.x + m.w, m.y + m.h,
            m.x      , m.y + m.h ])
        e_array = e_array.concat([ix + 0, ix + 1, ix + 2, ix + 0, ix + 2, ix + 3])
        ix += 4
        e_count += 6
    })
    
    drawCommands.push({
        'vbo': makeBuffer(
            gl,
            gl.ARRAY_BUFFER,
            new WebGLFloatArray(pos_array.concat(tc_array))),
        'pos_offset': 0,
        'tc_offset': ix * 8,
        'ebo': makeBuffer(
            gl,
            gl.ELEMENT_ARRAY_BUFFER,
            new WebGLUnsignedShortArray(e_array)),
        'count': e_count,
        'texture': textures['tiles'],
        'image': images['tiles'],
        'mode': gl.TRIANGLES
    })
}

function loadObjects(gl, objects)
{
    
}

function init()
{
    var gl = initWebGL('game')
    
    var resman = new ResourceManager(
        9, // total # of expected resources to load, set to 0 and watch console log if it's wrong
        function (name) // progress
        {
            // console.log('Loaded: ' + name)
            $('progress-bar').style.width = resman.percentComplete() + '%'
        },
        function (name) // success
        {
            $('progress-box').style.visibility = 'hidden'
            $('game').style.visibility = 'visible'
            $('framerate').style.visibility = 'visible'
            $('ack').style.visibility = 'visible'
            loaded = true
        },
        function (name) // failure
        {
            $('progress-bar').style.backgroundColor = 'red'
            $('progress-box').style.borderColor = 'red'
        })
    
    linkProgram('shaders/pixels.vert', 'shaders/boring.frag', gl, resman, function (p)
    {
        program = p
    })

    TEXTURE_FILES.each(function (base)
    {
        loadTexture(escape('images/' + base + '.png'), gl, resman, function(i, t)
        {
            images[base] = i
            textures[base] = t
        })
    })
    
    xhrJSON('images/tilemetrics.json', resman, function(json)
    {
        tilemetrics = json
        
        // TODO load the map in parallel using a technique like program linking
        xhrJSON('maps/map.json', resman, function(json)
        {
            map = json

            loadPlanes(gl, map['width'], map['height'], map['planes'])
            loadScenery(gl, map['scenery'])
            loadObjects(gl, map['objects'])
        })
    })
    
    return gl
}

function reshape(gl)
{
    var canvas = document.getElementById('game')
    if (canvas.clientWidth == width && canvas.clientHeight == height)
        return

    width = canvas.clientWidth
    height = canvas.clientHeight
    
    gl.viewport(0, 0, width, height)
}

function draw(gl)
{
    if (!loaded) return
    
    reshape(gl)
    gl.clearColor(0.0, 0xcc / 255.0, 1.0, 1.0)
    $('framerate').style.backgroundColor = '#00ccff'
    $('ack').style.backgroundColor = '#00ccff'
    gl.clear(gl.COLOR_BUFFER_BIT)
    
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.useProgram(program)
    gl.uniform2f(
        gl.getUniformLocation(program, 'window_size'),
        width,
        height)
    gl.uniform1i(
        gl.getUniformLocation(program, 'texture'),
        0)

    pos_loc = gl.getAttribLocation(program, 'position')
    tc_loc = gl.getAttribLocation(program, 'tc_in')
    
    gl.enableVertexAttribArray(pos_loc)
    gl.enableVertexAttribArray(tc_loc)
    
    drawCommands.each(function (command)
    {
        gl.uniform2f(
            gl.getUniformLocation(program, 'image_size'),
            command.image.width,
            command.image.height)
        gl.bindTexture(gl.TEXTURE_2D, command.texture)
        
        gl.bindBuffer(gl.ARRAY_BUFFER, command.vbo)
        gl.vertexAttribPointer(
            pos_loc,
            2,
            gl.FLOAT,
            false,
            0,
            command.v_offset)
        gl.vertexAttribPointer(
            tc_loc,
            2,
            gl.FLOAT,
            false,
            0,
            command.tc_offset)
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, command.ebo)
        gl.drawElements(
            command.mode,
            command.count,
            gl.UNSIGNED_SHORT,
            0)
    })
    
    gl.flush()
    framerate.snapshot()
    e = gl.getError()
    if (e != 0)
    {
        console.log('GL Error: ' + e)
    }
}

function start()
{
    var gl = init()
    framerate = new Framerate('framerate')
    setInterval(function() { draw(gl) }, 10)
}

function keydown(event)
{/*
    switch(event.keyCode)
    {
    case KEY_LEFT:
        pc.x -= 1
        break
    case KEY_RIGHT:
        pc.x += 1
        break
    case KEY_DOWN:
        pc.y -= 1
        break
    case KEY_UP:
        pc.y += 1
        break
    }*/
}

function keyup(event)
{
}
