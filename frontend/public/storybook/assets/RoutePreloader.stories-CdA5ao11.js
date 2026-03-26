import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{r as l}from"./index-BRD0Ja2P.js";import{u as i}from"./next-navigation-DE2mOHfK.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";import"./index-aA1Q6uWB.js";function p(){const r=i();return l.useEffect(()=>{["/app","/app/groups","/app/updates","/app/settings","/app/profile"].forEach(a=>{r.prefetch(a)}),console.log("[RoutePreloader] Preloaded all app routes")},[r]),null}const x={title:"Utility/RoutePreloader",component:p,parameters:{layout:"centered",docs:{description:{component:"Invisible utility component that prefetches all app routes on mount using Next.js router.prefetch(). Renders nothing visible — place it once inside AppLayout."}}},tags:["autodocs"]},o={render:()=>e.jsxs("div",{style:{padding:24,color:"#94a3b8",fontFamily:"monospace",fontSize:14},children:[e.jsx(p,{}),e.jsx("p",{children:"RoutePreloader renders nothing visible."}),e.jsxs("p",{children:["On mount it calls ",e.jsx("code",{children:"router.prefetch()"})," for all app routes."]}),e.jsx("p",{children:"Check the browser console for the preload log."})]})};var t,n,s;o.parameters={...o.parameters,docs:{...(t=o.parameters)==null?void 0:t.docs,source:{originalSource:`{
  render: () => <div style={{
    padding: 24,
    color: '#94a3b8',
    fontFamily: 'monospace',
    fontSize: 14
  }}>
      <RoutePreloader />
      <p>RoutePreloader renders nothing visible.</p>
      <p>On mount it calls <code>router.prefetch()</code> for all app routes.</p>
      <p>Check the browser console for the preload log.</p>
    </div>
}`,...(s=(n=o.parameters)==null?void 0:n.docs)==null?void 0:s.source}}};const j=["Default"];export{o as Default,j as __namedExportsOrder,x as default};
