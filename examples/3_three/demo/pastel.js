import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xthree from 'xnew/addons/xthree';
import * as PIXI from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const fragment = `
in vec2 vTextureCoord;

uniform sampler2D uTexture;

const float DOUBLE_PI = 3.14159265358979323846264 * 2.;
const float ANGLE_STEP = DOUBLE_PI / 50.0; // ← コンパイル前にJS側で計算した値に置換される
const float EDGE_RATE_OF_OUTLINE = 0.43;
const float ANGLE_STEP_EDGE = ANGLE_STEP * EDGE_RATE_OF_OUTLINE * EDGE_RATE_OF_OUTLINE;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

/* ベースの色に影の色をのせた色を求める */
vec4 shadowColor (vec4 baseRgba, float amount, float shAngle) {
  vec3 sh2 = vec3(2.3, 0.5, 0.0);
  vec3 sh1 = vec3(2.3, 0.5, 0.0);
  vec3 sh = mix(sh1, sh2, shAngle);
  return vec4(mix(sh, baseRgba.rgb, 1.0 - amount), baseRgba.a);
}

/* フィルタのメイン処理 */
void main(void) {
  vec2 uSize = vec2(0.005, 0.01);

  vec4 FC = vec4(0., 0., 1., 1.);
  float noizeX = (rand(vTextureCoord * 100.0) - 0.5) * uSize.x * 0.1;
  float noizeY = (rand(vTextureCoord * 100.0 + 10.0) - 0.5) * uSize.y * 0.2;
  vec2 sourceCoord = clamp(vTextureCoord + vec2(noizeX, noizeY), FC.xy, FC.zw);
  vec4 ownColor = texture2D(uTexture, sourceCoord);
  vec4 curColor;
  vec2 displaced;

  /* サンプリング1周目。エッジ判定を行い影をつける量を求める */
  float minAlphaOl = 1.0;
  float totalAlphaOl = 0.0;
  for (float angle = 0.; angle <= DOUBLE_PI; angle += ANGLE_STEP) {
    displaced.x = vTextureCoord.x + uSize.x * cos(angle);
    displaced.y = vTextureCoord.y + uSize.y * sin(angle);
    curColor = texture2D(uTexture, clamp(displaced, FC.xy, FC.zw));
    minAlphaOl = min(minAlphaOl, curColor.a);
    totalAlphaOl += curColor.a;
  }

  /* サンプリング2周目。1周目と異なる条件で
  エッジ判定を行い、エッジに適用するモサモサのノイズ量を求める */
  vec2 sizeEdge = uSize * EDGE_RATE_OF_OUTLINE;
  float minAlphaEd = 1.0;
  float totalAlphaEd = 0.0;
  for (float angle = 0.; angle <= DOUBLE_PI; angle += ANGLE_STEP_EDGE) {
    displaced.x = vTextureCoord.x + sizeEdge.x * cos(angle);
    displaced.y = vTextureCoord.y + sizeEdge.y * sin(angle);
    curColor = texture2D(uTexture, clamp(displaced, FC.xy, FC.zw));
    minAlphaEd = min(minAlphaEd, curColor.a);
    totalAlphaEd += curColor.a;
  }

  /* サンプリングで求めた値を元に色とアルファ値を決める */
  float avrAlphaOl = 1.0 - totalAlphaOl / (DOUBLE_PI / ANGLE_STEP);
  float avrAlphaEd = 1.0 - totalAlphaEd / (DOUBLE_PI / ANGLE_STEP_EDGE);
  float noise1 = rand(vTextureCoord * 10000.0);
  float noise2 = rand(vTextureCoord * 1000.0) + 0.3;
  float noise3 = rand(vTextureCoord * 10000.0 * noise2);
  float outlineAlpha = avrAlphaOl * noise1;
  float edgeAlpha = (1.0 - pow(avrAlphaEd * noise2, 2.0)) * ownColor.a * min(noise3 + 0.9, 1.0);
  float shadowAngle =  distance(vec2(.0, .0), vTextureCoord) / 1.41421356;
  vec3 resultRgb = shadowColor(ownColor, outlineAlpha,shadowAngle).rgb;
  resultRgb *= edgeAlpha;
  gl_FragColor = vec4(resultRgb, edgeAlpha);
}
`;
export function PastelFilter(self, object) {
    const filter = new PIXI.Filter({
        // Shader programs
        glProgram: new PIXI.GlProgram({ vertex, fragment }),

        // Resources (uniforms, textures, etc)
        resources: {
            waveUniforms: {
                // uWaveAmplitude: { value: 0.05, type: 'f32' },
                // uWaveFrequency: { value: 10.0, type: 'f32' },
                // uTime: { value: 0.0, type: 'f32' }
            }
        }
    });

    // Apply the filter
    object.filters = [filter];
}