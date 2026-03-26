const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./MermaidDiagram-DoqJz5eP.js","./jsx-runtime-EKYJJIwR.js","./index-BRD0Ja2P.js","./_commonjsHelpers-Cpj98o6Y.js","./index-DMNe2g_Q.js","./MermaidDiagram-fpu8ftrg.css"])))=>i.map(i=>d[i]);
import{_ as X}from"./iframe-RQmeSJ4X.js";import{r as K,j as _}from"./jsx-runtime-EKYJJIwR.js";import{g as z}from"./_commonjsHelpers-Cpj98o6Y.js";import{r as x}from"./index-DMNe2g_Q.js";var E={exports:{}},M={},I;function T(){if(I)return M;I=1;function d(i){return i&&i.__esModule?i:{default:i}}return M._=d,M}function $(d){throw new Error('Could not dynamically require "'+d+'". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.')}var A={},L={},P;function ee(){return P||(P=1,(function(d){"use client";Object.defineProperty(d,"__esModule",{value:!0}),Object.defineProperty(d,"LoadableContext",{enumerable:!0,get:function(){return m}});const m=T()._(x()).default.createContext(null)})(L)),L}var G;function re(){return G||(G=1,(function(d){Object.defineProperty(d,"__esModule",{value:!0}),Object.defineProperty(d,"default",{enumerable:!0,get:function(){return n}});const f=T()._(x()),m=ee();function D(r){return r&&r.default?r.default:r}const b=[],y=[];let h=!1;function S(r){let t=r(),e={loading:!0,loaded:null,error:null};return e.promise=t.then(a=>(e.loading=!1,e.loaded=a,a)).catch(a=>{throw e.loading=!1,e.error=a,a}),e}function q(r,t){let e=Object.assign({loader:null,loading:null,delay:200,timeout:null,webpack:null,modules:null},t),a=null;function p(){if(!a){const s=new o(r,e);a={getCurrentValue:s.getCurrentValue.bind(s),subscribe:s.subscribe.bind(s),retry:s.retry.bind(s),promise:s.promise.bind(s)}}return a.promise()}if(typeof window>"u"&&b.push(p),!h&&typeof window<"u"){const s=e.webpack&&typeof $.resolveWeak=="function"?e.webpack():e.modules;s&&y.push(g=>{for(const c of s)if(g.includes(c))return p()})}function J(){p();const s=f.default.useContext(m.LoadableContext);s&&Array.isArray(e.modules)&&e.modules.forEach(g=>{s(g)})}function w(s,g){J();const c=f.default.useSyncExternalStore(a.subscribe,a.getCurrentValue,a.getCurrentValue);return f.default.useImperativeHandle(g,()=>({retry:a.retry}),[]),f.default.useMemo(()=>c.loading||c.error?f.default.createElement(e.loading,{isLoading:c.loading,pastDelay:c.pastDelay,timedOut:c.timedOut,error:c.error,retry:a.retry}):c.loaded?f.default.createElement(D(c.loaded),s):null,[s,c])}return w.preload=()=>p(),w.displayName="LoadableComponent",f.default.forwardRef(w)}class o{constructor(t,e){this._loadFn=t,this._opts=e,this._callbacks=new Set,this._delay=null,this._timeout=null,this.retry()}promise(){return this._res.promise}retry(){this._clearTimeouts(),this._res=this._loadFn(this._opts.loader),this._state={pastDelay:!1,timedOut:!1};const{_res:t,_opts:e}=this;t.loading&&(typeof e.delay=="number"&&(e.delay===0?this._state.pastDelay=!0:this._delay=setTimeout(()=>{this._update({pastDelay:!0})},e.delay)),typeof e.timeout=="number"&&(this._timeout=setTimeout(()=>{this._update({timedOut:!0})},e.timeout))),this._res.promise.then(()=>{this._update({}),this._clearTimeouts()}).catch(a=>{this._update({}),this._clearTimeouts()}),this._update({})}_update(t){this._state={...this._state,error:this._res.error,loaded:this._res.loaded,loading:this._res.loading,...t},this._callbacks.forEach(e=>e())}_clearTimeouts(){clearTimeout(this._delay),clearTimeout(this._timeout)}getCurrentValue(){return this._state}subscribe(t){return this._callbacks.add(t),()=>{this._callbacks.delete(t)}}}function u(r){return q(S,r)}function l(r,t){let e=[];for(;r.length;){let a=r.pop();e.push(a(t))}return Promise.all(e).then(()=>{if(r.length)return l(r,t)})}u.preloadAll=()=>new Promise((r,t)=>{l(b).then(r,t)}),u.preloadReady=(r=[])=>new Promise(t=>{const e=()=>(h=!0,t());l(y,r).then(e,e)}),typeof window<"u"&&(window.__NEXT_PRELOADREADY=u.preloadReady);const n=u})(A)),A}var O;function te(){return O||(O=1,(function(d,i){Object.defineProperty(i,"__esModule",{value:!0});function f(o,u){for(var l in u)Object.defineProperty(o,l,{enumerable:!0,get:u[l]})}f(i,{default:function(){return q},noSSR:function(){return S}});const m=T(),D=K();x();const b=m._(re()),y=typeof window>"u";function h(o){return{default:(o==null?void 0:o.default)||o}}function S(o,u){if(delete u.webpack,delete u.modules,!y)return o(u);const l=u.loading;return()=>(0,D.jsx)(l,{error:null,isLoading:!0,pastDelay:!1,timedOut:!1})}function q(o,u){let l=b.default,n={loading:({error:e,isLoading:a,pastDelay:p})=>null};o instanceof Promise?n.loader=()=>o:typeof o=="function"?n.loader=o:typeof o=="object"&&(n={...n,...o}),n={...n,...u};const r=n.loader,t=()=>r!=null?r().then(h):Promise.resolve(h(()=>null));return n.loadableGenerated&&(n={...n,...n.loadableGenerated},delete n.loadableGenerated),typeof n.ssr=="boolean"&&!n.ssr?(delete n.webpack,delete n.modules,S(l,n)):l({...n,loader:t})}(typeof i.default=="function"||typeof i.default=="object"&&i.default!==null)&&typeof i.default.__esModule>"u"&&(Object.defineProperty(i.default,"__esModule",{value:!0}),Object.assign(i.default,i),d.exports=i.default)})(E,E.exports)),E.exports}var k,F;function ne(){return F||(F=1,k=te()),k}var ae=ne();const ie=z(ae),j=ie(()=>X(()=>import("./MermaidDiagram-DoqJz5eP.js"),__vite__mapDeps([0,1,2,3,4,5]),import.meta.url),{ssr:!1}),le={title:"Utility/MermaidDiagram",parameters:{layout:"centered",docs:{description:{component:"Renders a Mermaid diagram from a chart string. Loaded dynamically (no SSR) to avoid build-time bundling issues."}}},tags:["autodocs"]},R={render:()=>_.jsx("div",{style:{padding:24,background:"#1e293b",borderRadius:12,minWidth:400},children:_.jsx(j,{chart:`flowchart TD
    A[User sends message] --> B{WebSocket connected?}
    B -- Yes --> C[Emit message:send]
    B -- No --> D[Queue message]
    C --> E[Server broadcasts to recipient]
    E --> F[Recipient receives message]`})})},v={render:()=>_.jsx("div",{style:{padding:24,background:"#1e293b",borderRadius:12,minWidth:400},children:_.jsx(j,{chart:`sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: connect (token)
    S-->>C: presence:update
    C->>S: message:send
    S-->>C: message:ack
    S-->>C: message:received (other party)`})})},C={render:()=>_.jsx("div",{style:{padding:24,background:"#1e293b",borderRadius:12,minWidth:400},children:_.jsx(j,{chart:`erDiagram
    USER ||--o{ MESSAGE : sends
    USER ||--o{ MESSAGE : receives
    MESSAGE ||--o{ REACTION : has
    MESSAGE ||--o{ MESSAGE_EDIT : has`})})};var W,N,U;R.parameters={...R.parameters,docs:{...(W=R.parameters)==null?void 0:W.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: 24,
    background: '#1e293b',
    borderRadius: 12,
    minWidth: 400
  }}>
      <MermaidDiagram chart={\`flowchart TD
    A[User sends message] --> B{WebSocket connected?}
    B -- Yes --> C[Emit message:send]
    B -- No --> D[Queue message]
    C --> E[Server broadcasts to recipient]
    E --> F[Recipient receives message]\`} />
    </div>
}`,...(U=(N=R.parameters)==null?void 0:N.docs)==null?void 0:U.source}}};var B,V,Y;v.parameters={...v.parameters,docs:{...(B=v.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: 24,
    background: '#1e293b',
    borderRadius: 12,
    minWidth: 400
  }}>
      <MermaidDiagram chart={\`sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: connect (token)
    S-->>C: presence:update
    C->>S: message:send
    S-->>C: message:ack
    S-->>C: message:received (other party)\`} />
    </div>
}`,...(Y=(V=v.parameters)==null?void 0:V.docs)==null?void 0:Y.source}}};var Q,Z,H;C.parameters={...C.parameters,docs:{...(Q=C.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: 24,
    background: '#1e293b',
    borderRadius: 12,
    minWidth: 400
  }}>
      <MermaidDiagram chart={\`erDiagram
    USER ||--o{ MESSAGE : sends
    USER ||--o{ MESSAGE : receives
    MESSAGE ||--o{ REACTION : has
    MESSAGE ||--o{ MESSAGE_EDIT : has\`} />
    </div>
}`,...(H=(Z=C.parameters)==null?void 0:Z.docs)==null?void 0:H.source}}};const ce=["Flowchart","SequenceDiagram","ERDiagram"];export{C as ERDiagram,R as Flowchart,v as SequenceDiagram,ce as __namedExportsOrder,le as default};
