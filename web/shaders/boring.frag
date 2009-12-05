uniform sampler2D texture;
uniform vec2 image_size;

varying vec2 texture_coords;

void main()
{
    gl_FragColor = texture2D(texture, vec2(
        texture_coords.x / image_size.x,
        (image_size.y - texture_coords.y) / image_size.y));
}
