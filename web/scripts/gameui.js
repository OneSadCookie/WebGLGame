window_width = 1
window_height = 1

program = null
textures = {}
images = {}

drawCommands = []
object_vbo = null
object_ebo = null
sounds = {}

scroll_x = 0
scroll_y = 0

TEXTURE_FILES = ['tiles']
AUDIO_FILES = ['Pickup', 'Door', 'Locked']

TEXTURE_HEIGHT = 170
HACK_OFFSET = 1
INVENTORY_X_OFFSET = 20
INVENTORY_Y_OFFSET = -20

function sTileAt(x, y, h)
{
    var tile = tileAt(x, y, h)
    return tile && tile.match(/Block/)
}

function banishBubble()
{
    $('bubble').style.visibility = 'hidden'
}

function placeBubble(source_x, source_y, player_x, player_y)
{
    bubble = $('bubble')
    x = (source_x - scroll_x + HACK_OFFSET) * TILE_WIDTH
    y = (source_y + scroll_y + 0.5) * TILE_GROUND_HEIGHT
    bubble.style.top = 'auto'
    bubble.style.right = 'auto'
    bubble.style.bottom = y
    bubble.style.left = x
    bubble.style.width = 'auto'
    bubble.style.maxWidth = window_width - x - INVENTORY_X_OFFSET - 30
    bubble.style.height = 'auto'
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
            new Float32Array(pos_array.concat(tc_array))),
        'pos_offset': 0,
        'tc_offset': ix * 8,
        'ebo': makeBuffer(
            gl,
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(e_array)),
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos_array.concat(tc_array)), gl.STREAM_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object_ebo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(e_array), gl.STREAM_DRAW)
    
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

function reshape(gl)
{
    var canvas = document.getElementById('game')
    if (canvas.clientWidth == window_width && canvas.clientHeight == window_height)
        return

    window_width = canvas.clientWidth
    window_height = canvas.clientHeight
    
    gl.viewport(0, 0, window_width, window_height)
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
        window_width,
        window_height)
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
    y = window_height - INVENTORY_Y_OFFSET - TILE_HEIGHT
    inventory.each(function(tile)
    {
        drawCommand(
            gl,
            makeDrawCommandForObjectAt(gl, tile, x, y))
        x += TILE_WIDTH + INVENTORY_X_OFFSET
    })
    
    framerate.snapshot()
    e = gl.getError()
    if (e != 0)
    {
        console.log('GL Error: ' + e)
    }
}

TileChangeEvent.prototype.updateUI = function ()
{
    if (this.to == 'Door Tall Open')
    {
        sounds['Door'].play()
    }
    
    // FIXME this leaks some VBOs, but it doesn't happen often,
    // should be fixed when WebGL matures and gives OpenGL objects
    // finalizers, and isn't easy to fix here and now.
    drawCommands[this.y] = null
}

ObjectRemoveEvent.prototype.updateUI = function () {}

ObjectMoveEvent.prototype.updateUI = function ()
{
    if (this.object == map['objects'][0])
    {
        $('bubble').style.visibility = 'hidden'
        scroll_x = this.object.x - 4
        scroll_y = this.object.y + 1
    }
}

ObjectFailedMoveEvent.prototype.updateUI = function ()
{
    if (this.block == 'Door Tall Closed')
    {
        sounds['Locked'].play()
    }
}

InventoryAddEvent.prototype.updateUI = function ()
{
    sounds['Pickup'].play()
}

InventoryRemoveEvent.prototype.updateUI = function () {}

SpeechEvent.prototype.updateUI = function ()
{
    $('bubble-speech').innerHTML = this.text
    placeBubble(
        this.object.x,
        this.object.y,
        map['objects'][0].x,
        map['objects'][0].y)
    $('bubble').style.visibility = 'visible'
}

CancelSpeechEvent.prototype.updateUI = function ()
{
    banishBubble()
}

function updateUI(events)
{
    events.each(function (e)
    {
        e.updateUI()
    })
}
