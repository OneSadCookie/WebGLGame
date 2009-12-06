uniform vec2 window_size;
uniform vec2 scroll;
uniform vec2 image_size;

varying vec2 texture_coords;

attribute vec2 position;
attribute vec2 tc_in;

void main()
{
    gl_Position = vec4(((position - scroll) / window_size) * 2.0 - 1.0, 0, 1);
    texture_coords = vec2(
        tc_in.x / image_size.x,
        (image_size.y - tc_in.y) / image_size.y);
}
