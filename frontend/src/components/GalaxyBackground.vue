<script setup>
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl'

const props = defineProps({
  density:            { type: Number,  default: 0.8  },
  hueShift:           { type: Number,  default: 140  },
  glowIntensity:      { type: Number,  default: 0.25 },
  saturation:         { type: Number,  default: 0    },
  twinkleIntensity:   { type: Number,  default: 0.3  },
  rotationSpeed:      { type: Number,  default: 0.04 },
  repulsionStrength:  { type: Number,  default: 2    },
  starSpeed:          { type: Number,  default: 0.5  },
  speed:              { type: Number,  default: 0.8  },
  mouseRepulsion:     { type: Boolean, default: true },
  mouseInteraction:   { type: Boolean, default: true },
})

const container = ref(null)

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`

const fragmentShader = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071,-0.7071,0.7071,0.7071)
#define PERIOD 3.0

float Hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float tri(float x){return abs(fract(x)*2.0-1.0);}
float tris(float x){float t=fract(x);return 1.0-smoothstep(0.0,1.0,abs(2.0*t-1.0));}
float trisn(float x){float t=fract(x);return 2.0*(1.0-smoothstep(0.0,1.0,abs(2.0*t-1.0)))-1.0;}

vec3 hsv2rgb(vec3 c){
  vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);
  vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);
  return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);
}

float Star(vec2 uv,float flare){
  float d=length(uv);
  float m=(0.05*uGlowIntensity)/d;
  float rays=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0));
  m+=rays*flare*uGlowIntensity;
  uv*=MAT45;
  rays=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0));
  m+=rays*0.3*flare*uGlowIntensity;
  m*=smoothstep(1.0,0.2,d);
  return m;
}

vec3 StarLayer(vec2 uv){
  vec3 col=vec3(0.0);
  vec2 gv=fract(uv)-0.5;
  vec2 id=floor(uv);
  for(int y=-1;y<=1;y++){
    for(int x=-1;x<=1;x++){
      vec2 offset=vec2(float(x),float(y));
      vec2 si=id+vec2(float(x),float(y));
      float seed=Hash21(si);
      float size=fract(seed*345.32);
      float glossLocal=tri(uStarSpeed/(PERIOD*seed+1.0));
      float flareSize=smoothstep(0.9,1.0,size)*glossLocal;
      float red=smoothstep(STAR_COLOR_CUTOFF,1.0,Hash21(si+1.0))+STAR_COLOR_CUTOFF;
      float blu=smoothstep(STAR_COLOR_CUTOFF,1.0,Hash21(si+3.0))+STAR_COLOR_CUTOFF;
      float grn=min(red,blu)*seed;
      vec3 base=vec3(red,grn,blu);
      float hue=atan(base.g-base.r,base.b-base.r)/(2.0*3.14159)+0.5;
      hue=fract(hue+uHueShift/360.0);
      float sat=length(base-vec3(dot(base,vec3(0.299,0.587,0.114))))*uSaturation;
      float val=max(max(base.r,base.g),base.b);
      base=hsv2rgb(vec3(hue,sat,val));
      vec2 pad=vec2(tris(seed*34.0+uTime*uSpeed/10.0),tris(seed*38.0+uTime*uSpeed/30.0))-0.5;
      float star=Star(gv-offset-pad,flareSize);
      float twinkle=trisn(uTime*uSpeed+seed*6.2831)*0.5+1.0;
      twinkle=mix(1.0,twinkle,uTwinkleIntensity);
      star*=twinkle;
      col+=star*size*base;
    }
  }
  return col;
}

void main(){
  vec2 focalPx=uFocal*uResolution.xy;
  vec2 uv=(vUv*uResolution.xy-focalPx)/uResolution.y;
  vec2 mouseNorm=uMouse-vec2(0.5);
  if(uMouseRepulsion){
    vec2 mousePosUV=(uMouse*uResolution.xy-focalPx)/uResolution.y;
    float mouseDist=length(uv-mousePosUV);
    vec2 repulsion=normalize(uv-mousePosUV)*(uRepulsionStrength/(mouseDist+0.1));
    uv+=repulsion*0.05*uMouseActiveFactor;
  } else {
    uv+=mouseNorm*0.1*uMouseActiveFactor;
  }
  float autoRotAngle=uTime*uRotationSpeed;
  mat2 autoRot=mat2(cos(autoRotAngle),-sin(autoRotAngle),sin(autoRotAngle),cos(autoRotAngle));
  uv=autoRot*uv;
  vec3 col=vec3(0.0);
  for(float i=0.0;i<1.0;i+=1.0/NUM_LAYER){
    float depth=fract(i+uStarSpeed*uSpeed);
    float scale=mix(20.0*uDensity,0.5*uDensity,depth);
    float fade=depth*smoothstep(1.0,0.9,depth);
    col+=StarLayer(uv*scale+i*453.32)*fade;
  }
  float alpha=length(col);
  alpha=smoothstep(0.0,0.25,alpha);
  alpha=min(alpha,1.0);
  gl_FragColor=vec4(col,alpha);
}
`

// 把可变状态都放在组件实例级别（setup 作用域内），不用模块级变量
let animateId = null
let rafRunning = false
let glState = null   // { renderer, gl, program, mesh, resize, target, smooth, onMouseMove, onMouseLeave }

function startRaf() {
  if (rafRunning || !glState) return
  rafRunning = true
  const { program, mesh, renderer, target, smooth } = glState

  function update(t) {
    if (!rafRunning) return
    animateId = requestAnimationFrame(update)
    program.uniforms.uTime.value = t * 0.001
    program.uniforms.uStarSpeed.value = (t * 0.001 * props.starSpeed) / 10.0
    const lf = 0.05
    smooth.x += (target.x - smooth.x) * lf
    smooth.y += (target.y - smooth.y) * lf
    smooth.active += (target.active - smooth.active) * lf
    program.uniforms.uMouse.value[0] = smooth.x
    program.uniforms.uMouse.value[1] = smooth.y
    program.uniforms.uMouseActiveFactor.value = smooth.active
    renderer.render({ scene: mesh })
  }
  animateId = requestAnimationFrame(update)
}

function stopRaf() {
  rafRunning = false
  if (animateId) { cancelAnimationFrame(animateId); animateId = null }
}

onMounted(() => {
  const ctn = container.value
  if (!ctn) return

  const renderer = new Renderer({ alpha: true, premultipliedAlpha: false })
  const gl = renderer.gl
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  let program

  function resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h)
    if (program) {
      program.uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
    }
  }
  window.addEventListener('resize', resize)

  const geometry = new Triangle(gl)
  program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      uTime:              { value: 0 },
      uResolution:        { value: new Color(1, 1, 1) },
      uFocal:             { value: new Float32Array([0.5, 0.5]) },
      uRotation:          { value: new Float32Array([1.0, 0.0]) },
      uStarSpeed:         { value: props.starSpeed },
      uDensity:           { value: props.density },
      uHueShift:          { value: props.hueShift },
      uSpeed:             { value: props.speed },
      uMouse:             { value: new Float32Array([0.5, 0.5]) },
      uGlowIntensity:     { value: props.glowIntensity },
      uSaturation:        { value: props.saturation },
      uMouseRepulsion:    { value: props.mouseRepulsion },
      uTwinkleIntensity:  { value: props.twinkleIntensity },
      uRotationSpeed:     { value: props.rotationSpeed },
      uRepulsionStrength: { value: props.repulsionStrength },
      uMouseActiveFactor: { value: 0.0 },
    },
  })

  const mesh = new Mesh(gl, { geometry, program })
  ctn.appendChild(gl.canvas)
  resize()

  const target = { x: 0.5, y: 0.5, active: 0 }
  const smooth = { x: 0.5, y: 0.5, active: 0 }

  function onMouseMove(e) {
    target.x = e.clientX / window.innerWidth
    target.y = 1.0 - e.clientY / window.innerHeight
    target.active = 1.0
  }
  function onMouseLeave() { target.active = 0.0 }

  if (props.mouseInteraction) {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
  }

  glState = { renderer, gl, program, mesh, resize, target, smooth, onMouseMove, onMouseLeave }
  startRaf()
})

// 路由切回来时恢复（KeepAlive 场景）
onActivated(() => {
  if (glState) {
    glState.resize()
    startRaf()
  }
})

// 路由切走时暂停，节省 GPU
onDeactivated(() => {
  stopRaf()
})

onUnmounted(() => {
  stopRaf()
  if (glState) {
    const { gl, onMouseMove, onMouseLeave, resize } = glState
    window.removeEventListener('resize', resize)
    if (props.mouseInteraction) {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
    const ctn = container.value
    if (ctn && gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    glState = null
  }
})
</script>

<template>
  <div ref="container" class="galaxy-bg" />
</template>

<style scoped>
.galaxy-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
}
.galaxy-bg :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
}
</style>
