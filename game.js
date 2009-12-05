width = 1
height = 1

loaded = false
ebo = null
program = null
image = null
textures = {}
images = {}
map = null

TILE_WIDTH = 101
TILE_HEIGHT = 82
TILE_FRONT_HEIGHT = 41
TEXTURE_HEIGHT = 170
HACK_OFFSET = 1

function makeDrawCommand(gl, tile, x, y, isCharacter)
{
    var yOffset = 0
    if (isCharacter)
    {
        yOffset = TILE_FRONT_HEIGHT
    }
    
    var quadarray = new WebGLFloatArray([
        // vertices
        (x + 0) * TILE_WIDTH, y * TILE_HEIGHT + yOffset,
        (x + 1) * TILE_WIDTH, y * TILE_HEIGHT + yOffset,
        (x + 1) * TILE_WIDTH, y * TILE_HEIGHT + yOffset + TEXTURE_HEIGHT,
        (x + 0) * TILE_WIDTH, y * TILE_HEIGHT + yOffset + TEXTURE_HEIGHT,
        
        // texcoords
        0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0,
    ])
    
    var vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, quadarray, gl.STATIC_DRAW)
    
    return {
        'vbo': vbo,
        'ebo': ebo,
        'mode': gl.TRIANGLE_FAN,
        'count': 4,
        'texture': textures[tile],
    }
}

function makeBufferObjects(gl)
{
    var indexarray = new WebGLUnsignedShortArray([
        0, 1, 2, 3
    ])
    
    ebo = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexarray, gl.STATIC_DRAW)
}

function init()
{
    var gl = initWebGL('game')
    makeBufferObjects(gl)
    
    var resman = new ResourceManager(
        116, // total # of expected resources to load
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
            loaded = true
        },
        function (name) // failure
        {
            $('progress-bar').style.backgroundColor = 'red'
        })
    
    linkProgram('shaders/pixels.vert', 'shaders/boring.frag', gl, resman, function (p)
    {
        program = p
    })
    TILES.each(function (base)
    {
        loadTexture(escape('PlanetCutePNG/' + base + '.png'), gl, resman, function(i, t)
        {
            images[base] = i
            textures[base] = t
        })
    })
    xhrJSON('map.json', resman, function(json)
    {
        map = json
        drawCommands = []
        map['planes'].each(function(plane)
        {
            var x = 0 + HACK_OFFSET
            var y = map['height'] - 1 + HACK_OFFSET
            plane.each(function (tile)
            {
                drawCommands.push(makeDrawCommand(gl, tile, x, y, false))
                x += 1
                if (x >= map['width'] + HACK_OFFSET)
                {
                    x = 0 + HACK_OFFSET
                    y -= 1
                }
            })
            
            // TODO height
        })
        map['items'].each(function(item)
        {
            drawCommands.push(makeDrawCommand(
                gl,
                item['type'],
                item['x'] + HACK_OFFSET,
                item['y'] + HACK_OFFSET,
                true))
            // TODO height
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
    if (!ebo || !loaded)
    {
        return
    }
    
    reshape(gl)
    gl.clearColor(1, 0, 1, 1)
    $('framerate').backgroundColor = '#ff00ff'
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
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo)

    drawCommands.each(function (command)
    {
        gl.bindTexture(gl.TEXTURE_2D, command['texture'])
        
        gl.bindBuffer(gl.ARRAY_BUFFER, command['vbo'])
        gl.vertexAttribPointer(
            pos_loc,
            2,
            gl.FLOAT,
            false,
            0,
            0)
        gl.vertexAttribPointer(
            tc_loc,
            2,
            gl.FLOAT,
            false,
            0,
            32)
        
        gl.drawElements(
            command['mode'],
            command['count'],
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
