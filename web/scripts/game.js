width = 1
height = 1

loaded = false
program = null
textures = {}
images = {}
tilemetrics = null
drawCommands = []

scroll_x = 0
scroll_y = 0

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

function passable(x, y, h)
{
    return x < map['width'] && x >= 0 &&
        y < map['height'] && y >= 0 &&
        h < map['planes'].size() && h >= 0 &&
        !map['planes'][h][x + map['width'] * y]
}

function makeBuffer(gl, target, data)
{
    var bo = gl.createBuffer()
    gl.bindBuffer(target, bo)
    gl.bufferData(target, data, gl.STATIC_DRAW)
    return bo
}

function loadPlanes(gl, width, height, planes)
{
    for (var y = 0; y < height; ++y)
    {
        var pos_array = []
        var tc_array = []
        var e_array = []
        var ix = 0
        var e_count = 0
        
        for (var x = 0; x < width; ++x)
        {
            for (var h = 0; h < planes.size(); ++h)
            {
                tile = planes[h][x + y * width]
                if (!tile) continue
                
                var bx = (x + HACK_OFFSET) * TILE_WIDTH
                var by = (height - y - 1 + HACK_OFFSET) * TILE_GROUND_HEIGHT +
                    h * TILE_FRONT_HEIGHT
                pos_array = pos_array.concat([
                    bx, by,
                    bx + TILE_WIDTH, by,
                    bx + TILE_WIDTH, by + TILE_HEIGHT,
                    bx, by + TILE_HEIGHT])
                var m = tilemetrics[tile]
                if (!m) console.error('No metrics for ' + tile)
                tc_array = tc_array.concat([
                    m.x      , m.y      ,
                    m.x + m.w, m.y      ,
                    m.x + m.w, m.y + m.h,
                    m.x      , m.y + m.h ])
                e_array = e_array.concat([ix + 0, ix + 1, ix + 2, ix + 0, ix + 2, ix + 3])
                ix += 4
                e_count += 6
            }
        }
        
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
}

function makeDrawCommandForObject(gl, object, height)
{
    var pos_array = []
    var tc_array = []
    var e_array = []
    
    var x = object.x
    var y = object.y
    var h = object.h
    var tile = object.tile
    
    var bx = (x + HACK_OFFSET) * TILE_WIDTH
    var by = (height - y - 1 + HACK_OFFSET) * TILE_GROUND_HEIGHT +
        h * TILE_FRONT_HEIGHT
    pos_array = pos_array.concat([
        bx, by,
        bx + TILE_WIDTH, by,
        bx + TILE_WIDTH, by + TILE_HEIGHT,
        bx, by + TILE_HEIGHT])
    var m = tilemetrics[tile]
    if (!m) console.error('No metrics for ' + tile)
    tc_array = tc_array.concat([
        m.x      , m.y      ,
        m.x + m.w, m.y      ,
        m.x + m.w, m.y + m.h,
        m.x      , m.y + m.h ])
    e_array = e_array.concat([0, 1, 2, 0, 2, 3])
    
    return {
        'vbo': makeBuffer(
            gl,
            gl.ARRAY_BUFFER,
            new WebGLFloatArray(pos_array.concat(tc_array))),
        'pos_offset': 0,
        'tc_offset': 4 * 8,
        'ebo': makeBuffer(
            gl,
            gl.ELEMENT_ARRAY_BUFFER,
            new WebGLUnsignedShortArray(e_array)),
        'count': 6,
        'texture': textures['tiles'],
        'image': images['tiles'],
        'mode': gl.TRIANGLES
    }
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
    
    linkProgram('shaders/tiles.vert', 'shaders/boring.frag', gl, resman, function (p)
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
            
            update_scroll()
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

function drawCommand(gl, command)
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
}

function draw(gl)
{
    if (!loaded) return
    
    reshape(gl)
    gl.clearColor(0.0, 0xcc / 255.0, 1.0, 1.0)
    // $('framerate').style.backgroundColor = '#00ccff'
    // $('ack').style.backgroundColor = '#00ccff'
    gl.clear(gl.COLOR_BUFFER_BIT)
    
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.useProgram(program)
    gl.uniform2f(
        gl.getUniformLocation(program, 'window_size'),
        width,
        height)
    var bx = (scroll_x + HACK_OFFSET) * TILE_WIDTH
    var by = (map['height'] - scroll_y - 1 + HACK_OFFSET) * TILE_GROUND_HEIGHT
    gl.uniform2f(
        gl.getUniformLocation(program, 'scroll'),
        bx, by)
    gl.uniform1i(
        gl.getUniformLocation(program, 'texture'),
        0)

    pos_loc = gl.getAttribLocation(program, 'position')
    tc_loc = gl.getAttribLocation(program, 'tc_in')
    
    gl.enableVertexAttribArray(pos_loc)
    gl.enableVertexAttribArray(tc_loc)
    
    drawCommands.each(function (command, y)
    {
        drawCommand(gl, command)
        
        map['objects'].each(function(object)
        {
            if (object.y == y)
            {
                drawCommand(
                    gl,
                    makeDrawCommandForObject(gl, object, map['height']))
            }
        })
    })
    
    gl.flush()
    framerate.snapshot()
    e = gl.getError()
    if (e != 0)
    {
        console.log('GL Error: ' + e)
    }
}

function update_scroll()
{
    scroll_x = map['objects'][0].x - 4
    scroll_y = map['objects'][0].y + 1
}

function start()
{
    var gl = init()
    framerate = new Framerate('framerate')
    setInterval(function() { draw(gl) }, 10)
}

function keydown(event)
{
    pc = map['objects'][0]
    switch(event.keyCode)
    {
    case KEY_LEFT:
        if (passable(pc.x - 1, pc.y, pc.h)) pc.x -= 1
        break
    case KEY_RIGHT:
        if (passable(pc.x + 1, pc.y, pc.h)) pc.x += 1
        break
    case KEY_DOWN:
        if (passable(pc.x, pc.y + 1, pc.h)) pc.y += 1
        break
    case KEY_UP:
        if (passable(pc.x, pc.y - 1, pc.h)) pc.y -= 1
        break
    }
    update_scroll()
}

function keyup(event)
{
}
