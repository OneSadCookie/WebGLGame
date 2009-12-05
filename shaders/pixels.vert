uniform vec2 window_size;

varying vec2 texture_coords;

attribute vec2 position;
attribute vec2 tc_in;

void main()
{
    gl_Position = vec4((position / window_size) * 2.0 - 1.0, 0, 1);
    texture_coords = tc_in;
}
