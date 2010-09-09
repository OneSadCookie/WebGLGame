uniform sampler2D texture;

varying mediump vec2 texture_coords;

void main()
{
    gl_FragColor = texture2D(texture, texture_coords);
}
