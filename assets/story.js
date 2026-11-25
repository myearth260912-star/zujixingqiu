// 官网下载页的滚动叙事（2026-11-25）。由 scripts/build_site_assets.py 原样复制到 site/assets/story.js。
//
// 一颗固定在屏幕背后的地球跟着滚动讲故事：首屏自己转 → 去过的国家一个个亮起来 → 航线一条条画出来
// → 转到夜里那一面看城市灯光 → 五款皮肤轮着换 → 退场；后面手机停住换屏幕、海报飞进来、一句大字随滚动逐字亮起，
// 最后地球回来托着下载按钮。页面上每一段用 data-scene 标出来，这里按滚动位置算出地球该是什么样，再每帧缓动过去。
//
// 地球不用 three.js：整屏一个三角形，片元着色器里按正射投影算出每个像素落在球面哪一点，再去查贴图。
// 贴图：白天地表、夜里城市灯光、云，加一张 mask（R 陆地、G 去过的国家亮起的先后、B 国界和海岸线），
// mask 由 build_site_assets.py 从 App 的国家索引图生成（国界跟 App 里同一份，中国视角）。
// 没有 WebGL 时地球留一张静态图，页面上其余的滚动效果照常。
(function () {
  var D = Math.PI / 180;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var sm = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var wrap = function (d) { d = (d + 540) % 360 - 180; return d; };

  var cv = document.getElementById('globe');
  var still = document.querySelector('.globe-still');
  var hero = document.querySelector('.hero');
  var scenes = [].slice.call(document.querySelectorAll('[data-scene]'));
  var W = innerWidth, H = innerHeight, mobile = W < 900;

  // ── 页面上的滚动效果（不依赖 WebGL）──
  function stickyQ(el) { var r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(r.height - H, 1), 0, 1); }
  function midP(el) { var r = el.getBoundingClientRect(); return (H * 0.5 - r.top) / r.height; }

  var heroCopy = hero && hero.querySelector('.copy');
  var fades = [].slice.call(document.querySelectorAll('[data-fade]'));
  var counts = [].slice.call(document.querySelectorAll('[data-count]'));
  var skinNames = [].slice.call(document.querySelectorAll('.skin-name span'));
  var steps = [].slice.call(document.querySelectorAll('.step'));
  var screens = [].slice.call(document.querySelectorAll('.screens img'));
  var phone3d = document.querySelector('.phones .phone');
  var prints = [].slice.call(document.querySelectorAll('.prints img'));
  var chars = [].slice.call(document.querySelectorAll('.vow-text span'));
  var facts = document.querySelector('.facts');
  var byName = {};
  scenes.forEach(function (s) { byName[s.getAttribute('data-scene')] = s; });
  var VISITED = 16;

  function dom() {
    var y = scrollY;
    if (heroCopy) {
      var h = clamp(y / (H * 0.7), 0, 1);
      heroCopy.style.opacity = String(1 - sm(0, 1, h));
      heroCopy.style.transform = 'translateY(' + (-h * 60) + 'px)';
    }
    fades.forEach(function (el) {
      var q = stickyQ(el.closest('[data-scene]'));
      var a = sm(0, 0.1, q) * (1 - sm(0.86, 0.98, q));
      el.style.opacity = String(a);
      el.style.transform = 'translateY(' + ((1 - sm(0, 0.12, q)) * 30 - sm(0.86, 1, q) * 30) + 'px)';
    });
    counts.forEach(function (el) {
      var s = el.closest('[data-scene]'), q = stickyQ(s), k = el.getAttribute('data-count'), to = +el.getAttribute('data-to');
      var v = k === 'visit' ? Math.min(VISITED, Math.floor(sm(0.12, 0.85, q) * (VISITED + 1))) : Math.round(to * sm(0.1, 0.85, q));
      el.textContent = k === 'km' ? v.toLocaleString('en') : String(v);
    });
    if (skinNames.length && byName.skins) {
      var qi = Math.round(stickyQ(byName.skins) * 4.4 - 0.2);
      skinNames.forEach(function (el, i) { el.classList.toggle('on', i === clamp(qi, 0, 4)); });
    }
    if (steps.length && byName.phones) {
      var pq = stickyQ(byName.phones), best = clamp(Math.floor(pq * steps.length), 0, steps.length - 1);
      screens.forEach(function (el, i) { el.classList.toggle('on', i === best); });
      steps.forEach(function (el, i) { el.classList.toggle('on', i === best); });
      if (phone3d) {
        phone3d.style.transform = 'perspective(1400px) rotateY(' + lerp(-14, 10, pq) + 'deg) rotateX(' + lerp(8, 2, pq) + 'deg)';
      }
    }
    if (prints.length && byName.poster) {
      var e = sm(0.05, 0.55, stickyQ(byName.poster));
      prints.forEach(function (el, i) {
        var dir = prints.length === 1 ? 1 : i === 0 ? -1 : 1;
        var base = prints.length === 1 ? 'translate(-50%,-50%)' : i === 0 ? 'translate(-82%,-52%)' : 'translate(-22%,-46%)';
        el.style.transform = base + ' translateY(' + ((1 - e) * (60 + i * 30)) + '%) rotate(' + (dir * (5 + (1 - e) * 14)) + 'deg)';
        el.style.opacity = String(sm(0, 0.4, e + 0.1));
      });
    }
    if (chars.length && byName.vow) {
      var vq = stickyQ(byName.vow);
      var n = chars.length;
      chars.forEach(function (el, i) { el.style.opacity = String(0.14 + 0.86 * clamp(vq * 1.5 * n - i, 0, 1)); });
      if (facts) { facts.style.opacity = String(sm(0.68, 0.82, vq)); facts.style.transform = 'translateY(' + (1 - sm(0.68, 0.82, vq)) * 20 + 'px)'; }
    }
  }

  // ── 地球各段的样子 ──
  // 位置按屏幕比例给：手机上球压在下半屏，电脑上球在右边
  function place(mx, my, mr, dx, dy, dr) {
    return mobile ? { x: W * mx, y: H * my, r: Math.min(W * mr, 340) } : { x: W * dx, y: H * dy, r: Math.min(H * dr, W * 0.3) };
  }
  function heroPlace() {
    if (!hero) return place(0.5, 0.8, 0.66, 0.7, 0.53, 0.43);
    var copy = hero.querySelector('.copy');
    if (mobile) {
      var below = copy ? copy.getBoundingClientRect().bottom + scrollY : H * 0.5;
      var r = Math.min(W * 0.66, 300);
      return { x: W * 0.5, y: Math.max(H - r * 0.48, below + 36 + r), r: r };
    }
    var h1 = hero.querySelector('h1');
    var right = h1 ? h1.getBoundingClientRect().right : W * 0.45;
    var rr = Math.min(H * 0.43, W * 0.3);
    return { x: Math.max(W * 0.68, right + 60 + rr), y: H * 0.53, r: rr };
  }
  var heroPos = null;
  var SKIN0 = [1, 0, 0, 0, 0];
  function S(o) {
    return {
      x: o.p.x, y: o.p.y, r: o.p.r, lon: o.lon, tilt: o.tilt == null ? 22 : o.tilt, sun: o.sun == null ? -40 : o.sun,
      visit: o.visit || 0, visitA: o.visitA || 0, route: o.route == null ? 1 : o.route, routeA: o.routeA == null ? 1 : o.routeA,
      lights: o.lights == null ? 1 : o.lights, skin: o.skin || SKIN0, alpha: o.alpha == null ? 1 : o.alpha, timed: !!o.timed,
    };
  }
  var story = function () { return place(0.5, 0.75, 0.46, 0.68, 0.52, 0.38); };
  var STATES = {
    hero: function (p, t) { return S({ p: heroPos, lon: 118 - t * 2, timed: true }); },
    visit: function (p) { return S({ p: story(), lon: 128 - 75 * p, tilt: 24, visit: sm(0.12, 0.85, p), visitA: 1, route: 0, routeA: 0, lights: 0.6 }); },
    routes: function (p) { return S({ p: story(), lon: 108 - 30 * p, tilt: 30, visit: 1, visitA: 0.35, route: sm(0.1, 0.85, p), routeA: 1, lights: 0.6 }); },
    night: function (p) { return S({ p: story(), lon: 112 - 12 * p, tilt: 26, sun: -40 + 195 * sm(0.08, 0.75, p), visit: 1, visitA: 0.2, routeA: 0.5, lights: 1 }); },
    skins: function (p) {
      var f = clamp(p, 0, 1) * 4.4 - 0.2, k = [0, 0, 0, 0, 0];
      var i = clamp(Math.floor(f), 0, 4), fr = sm(0.3, 0.7, f - i);
      if (f <= 0) k[0] = 1; else if (i >= 4) k[4] = 1; else { k[i] = 1 - fr; k[i + 1] = fr; }
      return S({ p: story(), lon: 110 - 150 * p, tilt: 22, skin: k, routeA: k[1] + k[4] * 0.6 });
    },
    // 手机那一段：地球放大、往上飘着淡出（淡出的快慢由段落进场的过渡控制）
    phones: function () { var s = STATES.skins(1); s.alpha = 0; s.r *= 1.3; s.y -= H * 0.25; return s; },
    poster: function () { var s = STATES.skins(1); s.alpha = 0; return s; },
    vow: function () { var s = STATES.skins(1); s.alpha = 0; return s; },
    end: function (p, t) { return S({ p: place(0.5, 1.1, 0.72, 0.5, 1.16, 0.62), lon: 118 - t * 2, tilt: 26, alpha: sm(0.05, 0.45, p), timed: true }); },
  };

  function target(t) {
    heroPos = heroPos || heroPlace();
    var cur = null, prev = null, curP = 0, curM = 0;
    for (var i = 0; i < scenes.length; i++) {
      var name = scenes[i].getAttribute('data-scene');
      if (!STATES[name]) continue;
      var m = name === 'hero' ? 0 : midP(scenes[i]);
      if (name === 'hero' || m >= 0) { prev = cur; cur = name; curM = m; curP = name === 'hero' || name === 'end' ? clamp(m, 0, 1) : stickyQ(scenes[i]); }
    }
    var s = STATES[cur](curP, t);
    if (prev && cur !== 'hero') {
      var a = STATES[prev](1, t), w = sm(0, 0.18, curM);
      var o = {};
      for (var k in s) {
        if (k === 'skin') o.skin = s.skin.map(function (v, j) { return lerp(a.skin[j], v, w); });
        else if (k === 'lon') o.lon = a.lon + wrap(s.lon - a.lon) * w;
        else if (k === 'timed') o.timed = w < 0.5 ? a.timed : s.timed;
        else o[k] = lerp(a[k], s[k], w);
      }
      s = o;
    }
    return s;
  }

  // ── WebGL ──
  var gl = cv && cv.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
  var U = {}, ready = false;
  if (gl) setupGL();

  function setupGL() {
    var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    var FS = [
      'precision highp float;',
      'uniform vec3 uS; uniform float uT, uLon, uTilt, uVisit, uVisitA, uRouteA, uLights, uPearl;',
      'uniform vec3 uSun; uniform vec4 uK;',
      'uniform sampler2D uDay, uNight, uCloud, uMask;',
      'uniform vec3 uA[6]; uniform vec3 uB[6]; uniform float uP[6];',
      'const float PI = 3.14159265;',
      'vec3 world(vec3 v){ float c=cos(uTilt), s=sin(uTilt); v=vec3(v.x, c*v.y+s*v.z, -s*v.y+c*v.z);',
      '  float a=cos(uLon), b=sin(uLon); return vec3(a*v.x+b*v.z, v.y, -b*v.x+a*v.z); }',
      'vec2 uvOf(float lat, float lon){ return vec2(lon/(2.0*PI)+0.5, 0.5-lat/PI); }',
      'void main(){',
      '  vec2 q=(gl_FragCoord.xy-uS.xy)/uS.z; float r=length(q); float px=1.5/uS.z;',
      '  vec3 sun=uSun; vec3 col=vec3(0.0); float a=0.0;',
      '  vec3 rimC=vec3(0.22,0.48,1.0)*(uK.x+uK.y)+vec3(0.2,0.9,0.8)*uK.z+vec3(1.0,0.75,0.35)*uK.w+vec3(1.0,0.86,0.9)*uPearl;',
      '  if(r<1.0){',
      '    vec3 n=vec3(q, sqrt(1.0-r*r)); vec3 p=world(n);',
      '    float lat=asin(clamp(p.y,-1.0,1.0)); float lon=atan(p.x,p.z);',
      '    vec2 uv=uvOf(lat,lon);',
      '    vec4 m=texture2D(uMask,uv); float land=m.r, rank=m.g, edge=m.b;',
      '    float d=dot(n,sun); float lam=max(d,0.0);',
      '    if(uK.x>0.001){',
      '      vec3 day=texture2D(uDay,uv).rgb; float lights=texture2D(uNight,uv).r;',
      '      float cl=texture2D(uCloud, vec2(fract(uv.x+uT*0.0015), uv.y)).r;',
      '      float lit=smoothstep(-0.16,0.22,d);',
      '      vec3 dayc=day*(0.18+1.05*lam);',
      '      dayc=mix(dayc, vec3(0.95,0.97,1.0)*(0.25+0.85*lam), cl*0.75);',
      '      vec3 night=vec3(1.0,0.7,0.36)*pow(lights,1.5)*1.9*uLights*(1.0-cl*0.6)+day*0.015;',
      '      col+=mix(night, dayc, lit)*uK.x;',
      '    }',
      '    float sh=0.55+0.45*lam;',
      '    if(uK.y>0.001){',
      '      vec3 c=mix(vec3(0.035,0.08,0.17), vec3(0.76,0.81,0.9), land)*sh;',
      '      c=mix(c, vec3(0.12,0.2,0.36), edge*land*0.7);',
      '      vec2 g=abs(fract(vec2(lat,lon)/(15.0*PI/180.0))-0.5); float gr=smoothstep(0.485,0.5,max(g.x,g.y));',
      '      c+=vec3(0.25,0.36,0.58)*gr*0.35*(1.0-land);',
      '      col+=c*uK.y;',
      '    }',
      '    if(uK.z>0.001){',
      '      float st=1.5*PI/180.0; float j=floor(lat/st); float clat=(j+0.5)*st;',
      '      float ls=st/max(cos(clat),0.12); float i=floor(lon/ls); float clon=(i+0.5)*ls;',
      '      float dl=length(vec2((lon-clon)*cos(lat), lat-clat))/st;',
      '      float lc=texture2D(uMask, uvOf(clat,clon)).r;',
      '      float dd=smoothstep(0.4,0.26,dl)*step(0.5,lc);',
      '      vec3 c=vec3(0.012,0.03,0.04)+vec3(0.3,0.95,0.82)*dd*(0.45+0.55*lam);',
      '      col+=c*uK.z;',
      '    }',
      '    if(uK.w>0.001){',
      '      vec3 c=mix(vec3(0.012,0.011,0.01), vec3(0.8,0.6,0.3)*(0.3+0.9*lam), land);',
      '      c+=vec3(1.0,0.82,0.48)*edge*0.55*(0.4+0.6*lam);',
      '      col+=c*uK.w;',
      '    }',
      '    if(uPearl>0.001){',
      '      vec3 c=mix(vec3(0.97,0.9,0.9), vec3(0.9,0.7,0.7), land)*(0.72+0.3*lam);',
      '      c+=vec3(1.0)*pow(max(dot(reflect(-sun,n),vec3(0.0,0.0,1.0)),0.0),14.0)*0.4;',
      '      c=mix(c, vec3(0.78,0.55,0.56), edge*land*0.5);',
      '      col+=c*uPearl;',
      '    }',
      // 去过的国家：按先后一个个亮，金色铺满加一圈亮边
      '    float vis=step(0.003,rank)*smoothstep(rank-0.015,rank+0.035,uVisit)*uVisitA;',
      '    col=mix(col, col*0.35+vec3(1.0,0.72,0.34)*(0.5+0.7*lam), vis*0.72);',
      '    col+=vec3(1.0,0.82,0.5)*edge*vis*0.9;',
      '    float rim=pow(1.0-n.z,2.6);',
      '    col+=rimC*rim*(0.25+0.75*smoothstep(-0.4,0.6,d));',
      '    float g=0.0; float w=max(0.0032, px*0.7);',
      '    for(int k=0;k<6;k++){',
      '      vec3 A=uA[k], B=uB[k]; vec3 nn=normalize(cross(A,B));',
      '      float dist=abs(dot(p,nn)); if(dist>0.06) continue;',
      '      float tot=acos(clamp(dot(A,B),-1.0,1.0));',
      '      vec3 pp=normalize(p-nn*dot(p,nn));',
      '      float t=atan(dot(cross(A,pp),nn), dot(A,pp))/tot;',
      '      float on=step(0.0,t)*step(t,uP[k]);',
      '      float head=fract(uT*0.11+float(k)*0.23);',
      '      float glint=exp(-abs(t-head)*28.0)*step(0.999,uP[k]);',
      '      g+=on*(smoothstep(w,w*0.2,dist)*(0.55+1.4*glint)+exp(-dist/(w*3.5))*(0.18+0.5*glint));',
      '      float e=length(p-B); g+=step(0.999,uP[k])*(smoothstep(0.011,0.004,e)*0.9+exp(-e/0.02)*0.25);',
      '    }',
      '    float h=length(p-uA[0]); g+=(smoothstep(0.014,0.006,h)*1.2+exp(-h/0.025)*0.4)*step(0.001,uP[0]);',
      '    col+=vec3(1.0,0.8,0.48)*g*(0.45+0.55*n.z)*uRouteA;',
      '    a=smoothstep(1.0,1.0-px,r);',
      '  }',
      '  float side=0.45+0.55*clamp(dot(normalize(q+vec2(0.0001)),normalize(sun.xy+vec2(0.0001))),0.0,1.0);',
      '  float halo=r>1.0-px ? exp(-(r-1.0)*9.0)*0.55*side : 0.0;',
      '  vec3 hc=rimC*halo;',
      '  gl_FragColor=vec4(col*a+hc*(1.0-a), a+halo*(1.0-a));',
      '}'
    ].join('\n');
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { gl = null; return; }
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return; }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uS', 'uT', 'uLon', 'uTilt', 'uVisit', 'uVisitA', 'uRouteA', 'uLights', 'uPearl', 'uSun', 'uK', 'uDay', 'uNight', 'uCloud', 'uMask', 'uA', 'uB', 'uP']
      .forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    function vec(lat, lon) { lat *= D; lon *= D; return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]; }
    var home = vec(31.23, 121.47), A = [], B = [];
    [[35.68, 139.69], [-33.87, 151.21], [1.35, 103.82], [48.86, 2.35], [-45.03, 168.66], [64.15, -21.94]]
      .forEach(function (d) { A.push.apply(A, home); B.push.apply(B, vec(d[0], d[1])); });
    gl.uniform3fv(U.uA, A); gl.uniform3fv(U.uB, B);
    var base = cv.getAttribute('data-base'), left = 4;
    function tex(unit, url, fmt) {
      var img = new Image();
      img.onload = function () {
        gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (--left === 0) {
          gl.uniform1i(U.uDay, 0); gl.uniform1i(U.uNight, 1); gl.uniform1i(U.uCloud, 2); gl.uniform1i(U.uMask, 3);
          ready = true; size(true); cv.classList.add('on'); if (still) still.classList.add('off');
        }
      };
      img.src = base + url;
    }
    tex(0, 'tex-day.webp', gl.RGB); tex(1, 'tex-night.webp', gl.RGB); tex(2, 'tex-cloud.webp', gl.RGB); tex(3, 'tex-mask.png', gl.RGB);
  }

  var dpr = Math.min(window.devicePixelRatio || 1, 1.75), cw = 0, ch = 0;
  function size(force) {
    // 手机上地址栏收起放下会改变高度，画布只在变宽或明显变高时重新分配，免得滚动时闪
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!force && w === cw && h <= ch + 120 && h >= ch - 200) return;
    cw = w; ch = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    if (gl) gl.viewport(0, 0, cv.width, cv.height);
  }
  addEventListener('resize', function () { W = innerWidth; H = innerHeight; mobile = W < 900; heroPos = null; if (gl) size(false); });

  var cur = null, t0 = 0, last = 0;
  function frame(now) {
    if (!t0) { t0 = now; last = now; }
    var t = reduce ? 40 : (now - t0) / 1000, dt = Math.min((now - last) / 1000, 0.1); last = now;
    dom();
    if (gl && ready) {
      var tg = target(t);
      if (!cur || reduce) cur = JSON.parse(JSON.stringify(tg));
      else {
        var f = 1 - Math.exp(-dt * 7);
        for (var k in tg) {
          if (k === 'skin') cur.skin = cur.skin.map(function (v, j) { return lerp(v, tg.skin[j], f); });
          else if (k === 'lon') cur.lon += wrap(tg.lon - cur.lon) * f;
          else if (k === 'timed') cur.timed = tg.timed;
          else cur[k] = lerp(cur[k], tg[k], f);
        }
      }
      cv.style.opacity = String(cur.alpha);
      if (cur.alpha > 0.01) draw(cur, t);
    }
    requestAnimationFrame(frame);
  }
  function draw(s, t) {
    // 画布是固定在屏幕上的，球心用视口坐标；WebGL 的 y 轴朝上
    gl.uniform3f(U.uS, s.x * dpr, cv.height - s.y * dpr, s.r * dpr);
    gl.uniform1f(U.uT, t); gl.uniform1f(U.uLon, s.lon * D); gl.uniform1f(U.uTilt, s.tilt * D);
    gl.uniform1f(U.uVisit, s.visit); gl.uniform1f(U.uVisitA, s.visitA); gl.uniform1f(U.uRouteA, s.routeA); gl.uniform1f(U.uLights, s.lights);
    var sa = s.sun * D; gl.uniform3f(U.uSun, Math.sin(sa) * 0.95, 0.32, Math.cos(sa) * 0.95);
    gl.uniform4f(U.uK, s.skin[0], s.skin[1], s.skin[2], s.skin[3]); gl.uniform1f(U.uPearl, s.skin[4]);
    var p = [], rp = s.timed ? clamp((t - 0.6) / 3.5, 0, 1) : s.route;
    for (var i = 0; i < 6; i++) p.push(clamp(rp * 1.6 - i * 0.12, 0, 1));
    gl.uniform1fv(U.uP, p);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
})();
