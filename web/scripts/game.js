width = 1
height = 1

loaded = false
program = null
textures = {}
images = {}
tilemetrics = null
drawCommands = []
object_vbo = null
object_ebo = null
sounds = {}

map = null
inventory = null
scroll_x = 0
scroll_y = 0

TEXTURE_FILES = ['tiles']
AUDIO_FILES = ['Pickup', 'Door', 'Locked']

TILE_WIDTH = 101
TILE_HEIGHT = 171
TILE_GROUND_HEIGHT = 82
TILE_FRONT_HEIGHT = 41
TEXTURE_HEIGHT = 170
HACK_OFFSET = 1
INVENTORY_X_OFFSET = 20
INVENTORY_Y_OFFSET = -20

function tileAt(x, y, h)
{
    if (x < 0 || x >= map['width'] ||
        y < 0 || y >= map['height'])
    {
        return null
    }
    
    var plane = map['planes'][h]
    if (plane)
    {
        return plane[x + map['width'] * y]
    }
    else
    {
        return null
    }
}

function sTileAt(x, y, h)
{
    var tile = tileAt(x, y, h)
    return tile && tile.match(/Block/)
}

function objectsAt(x, y, h)
{
    return map['objects'].select(function(o)
    {
        return o.x == x && o.y == y && o.h == h
    })
}

function rampTile(dx, dy)
{
    if (dx == 0)
    {
        if (dy == -1)
        {
            return "Ramp North"
        }
        else
        {
            return "Ramp South"
        }
    }
    else if (dx == -1)
    {
        return "Ramp East"
    }
    else
    {
        return "Ramp West"
    }
    
    console.log('Weird dx/dy combination in rampTile')
}

function passable(tile)
{
    return !tile || tile == 'Door Tall Open'
}

function doMove(object, dx, dy)
{
    var new_x = object.x + dx
    var new_y = object.y + dy
    
     if (new_x >= map['width']  || new_x < 0 ||
         new_y >= map['height'] || new_y < 0)
    {
        return
    }
    
    var current_tile = tileAt(object.x, object.y, object.h - 1)
    var next_tile_wall = tileAt(new_x, new_y, object.h)
    var next_tile_ground = tileAt(new_x, new_y, object.h - 1)
    if (passable(next_tile_wall) && next_tile_ground)
    {
        object.x = new_x
        object.y = new_y
    }
    else if (next_tile_wall == 'Door Tall Closed')
    {
        if (inventory.indexOf('Key') >= 0)
        {
            sounds['Door'].play()
            map['planes'][object.h][new_x + map['width'] * new_y] = 'Door Tall Open'
            inventory.splice(inventory.indexOf('Key'), 1)
            object.x = new_x
            object.y = new_y
            
            // FIXME this leaks some VBOs, but it doesn't happen often,
            // should be fixed when WebGL matures and gives OpenGL objects
            // finalizers, and isn't easy to fix here and now.
            drawCommands[new_y] = null
        }
        else
        {
            sounds['Locked'].play()
        }
    }
    else if (next_tile_wall == rampTile(dx, dy))
    {
        object.x = new_x
        object.y = new_y
        object.h += 1
    }
    else if (current_tile == rampTile(-dx, -dy))
    {
        var next_tile_ground2 = tileAt(new_x, new_y, object.h - 2)
        if (!next_tile_ground && next_tile_ground2)
        {
            object.x = new_x
            object.y = new_y
            object.h -= 1
        }
    }
    
    var os = objectsAt(object.x, object.y, object.h)
    os.splice(0, 1) // remove the player
    if (os.size() > 0)
    {
        sounds['Pickup'].play()
        inventory = inventory.concat(os.map(function(o)
        {
            return o.tile
        }))
        map['objects'] = map['objects'].reject(function(o)
        {
            return os.indexOf(o) >= 0
        })
        
    }
}

function makeBuffer(gl, target, data)
{
    var bo = gl.createBuffer()
    gl.bindBuffer(target, bo)
    gl.bufferData(target, data, gl.STATIC_DRAW)
    return bo
}

function imagesForTile(planes, x, y, h)
{
    var tiles = []
    var tile = tileAt(x, y, h)
    if (tile)
    {
        tiles.push(tile)
        
        if (sTileAt(x - 1, y, h + 1))
        {
            tiles.push('Shadow West')
        }
        else
        {
            if (sTileAt(x - 1, y + 1, h + 1))
            {
                tiles.push('Shadow South West')
            }
            if (sTileAt(x - 1, y - 1, h + 1) && !sTileAt(x, y - 1, h + 1))
            {
                tiles.push('Shadow North West')
            }
        }

        if (sTileAt(x + 1, y, h + 1))
        {
            tiles.push('Shadow East')
        }
        else
        {
            if (sTileAt(x + 1, y + 1, h + 1))
            {
                tiles.push('Shadow South East')
            }
            if (sTileAt(x + 1, y - 1, h + 1) && !sTileAt(x, y - 1, h + 1))
            {
                tiles.push('Shadow North East')
            }
        }

        if (sTileAt(x, y - 1, h + 1))
        {
            tiles.push('Shadow North')
        }

        if (sTileAt(x, y + 1, h + 1))
        {
            tiles.push('Shadow South')
        }
        
        if (sTileAt(x - 1, y + 1, h) && !sTileAt(x, y + 1, h))
        {
            tiles.push('Shadow Side West')
        }
    }
    else
    {
        if (sTileAt(x, y + 1, h + 1) && !sTileAt(x, y, h + 1))
        {
            tiles.push('Shadow South')
        }
    }
    
    return tiles
}

function loadYSlice(gl, y, width, height, planes)
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
            var tiles = imagesForTile(planes, x, y, h)
            
            var bx = (x + HACK_OFFSET) * TILE_WIDTH
            var by = (height - y - 1 + HACK_OFFSET) * TILE_GROUND_HEIGHT +
                h * TILE_FRONT_HEIGHT
            tiles.each(function (tile)
            {
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
            })
        }
    }
    
    if (!images['tiles'])
    {
        console.error("loadYSlice called before image ready; loaded=" + loaded)
    }
    return {
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
    }
}

function loadPlanes(gl, width, height, planes)
{
    for (var y = 0; y < height; ++y)
    {
        drawCommands.push(loadYSlice(gl, y, width, height, planes))
    }
}

function makeDrawCommandForObjectAt(gl, tile, x, y)
{
    var m = tilemetrics[tile]
    if (!m)
    {
        console.error('No metrics for ' + tile)
        return null
    }

    var pos_array = [
        x, y,
        x + TILE_WIDTH, y,
        x + TILE_WIDTH, y + TILE_HEIGHT,
        x, y + TILE_HEIGHT]
    var tc_array = [
        m.x      , m.y      ,
        m.x + m.w, m.y      ,
        m.x + m.w, m.y + m.h,
        m.x      , m.y + m.h ]
    e_array = [0, 1, 2, 0, 2, 3]
    
    gl.bindBuffer(gl.ARRAY_BUFFER, object_vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new WebGLFloatArray(pos_array.concat(tc_array)), gl.STREAM_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object_ebo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new WebGLUnsignedShortArray(e_array), gl.STREAM_DRAW)
    
    if (!images['tiles'])
    {
        console.error("makeDrawCommandForObjectAt called before image ready; loaded=" + loaded)
    }
    return {
        'vbo': object_vbo,
        'pos_offset': 0,
        'tc_offset': 4 * 8,
        'ebo': object_ebo,
        'count': 6,
        'texture': textures['tiles'],
        'image': images['tiles'],
        'mode': gl.TRIANGLES
    }
}

function makeDrawCommandForObject(gl, object, height)
{
    var bx = (object.x + HACK_OFFSET) * TILE_WIDTH
    var by = (height - object.y - 1 + HACK_OFFSET) * TILE_GROUND_HEIGHT +
        object.h * TILE_FRONT_HEIGHT
    
    return makeDrawCommandForObjectAt(gl, object.tile, bx, by)
}

function init()
{
    var gl = initWebGL('game')
    object_vbo = gl.createBuffer()
    object_ebo = gl.createBuffer()
    
    var resman = new ResourceManager(
        12, // total # of expected resources to load, set to 0 and watch console log if it's wrong
        function(name) // progress
        {
            // console.log('Loaded: ' + name)
            $('progress-bar').style.width = resman.percentComplete() + '%'
        },
        function(name) // success
        {
            loadPlanes(gl, map['width'], map['height'], map['planes'])
            
            update_scroll()
            inventory = []
            
            $('progress-box').style.visibility = 'hidden'
            $('game').style.visibility = 'visible'
            $('framerate').style.visibility = 'visible'
            $('ack').style.visibility = 'visible'
            loaded = true
        },
        function(name) // failure
        {
            $('progress-bar').style.backgroundColor = 'red'
            $('progress-box').style.borderColor = 'red'
        })
    
    linkProgram('shaders/tiles.vert', 'shaders/boring.frag', gl, resman, function (p)
    {
        program = p
    })

    TEXTURE_FILES.each(function(base)
    {
        loadTexture(escape('images/' + base + '.png'), gl, resman, function(i, t)
        {
            images[base] = i
            textures[base] = t
        })
    })
    
    AUDIO_FILES.each(function(base)
    {
        xhrAudio(escape('audio/' + base + '.wav'), resman, function(s)
        {
            sounds[base] = s
        })
    })
    
    xhrJSON('images/tilemetrics.json', resman, function(json)
    {
        tilemetrics = json
    })
    
    xhrJSON('maps/map.json', resman, function(json)
    {
        map = json
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
    
    for (var y = 0; y < drawCommands.size(); ++y)
    {
        var command = drawCommands[y]
        if (command == null)
        {
            // it's been invalidated by a tile map change, recalculate
            command = loadYSlice(gl, y, map['width'], map['height'], map['planes'])
            drawCommands[y] = command
        }
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
    }
    
    gl.uniform2f(
        gl.getUniformLocation(program, 'scroll'),
        0, 0)
    x = INVENTORY_X_OFFSET
    y = height - INVENTORY_Y_OFFSET - TILE_HEIGHT
    inventory.each(function(tile)
    {
        drawCommand(
            gl,
            makeDrawCommandForObjectAt(gl, tile, x, y))
        x += TILE_WIDTH + INVENTORY_X_OFFSET
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
    case Event.KEY_LEFT:
        doMove(pc, -1, 0)
        break
    case Event.KEY_RIGHT:
        doMove(pc,  1, 0)
        break
    case Event.KEY_DOWN:
        doMove(pc, 0,  1)
        break
    case Event.KEY_UP:
        doMove(pc, 0, -1)
        break
    }
    update_scroll()
}

function keyup(event)
{
}
