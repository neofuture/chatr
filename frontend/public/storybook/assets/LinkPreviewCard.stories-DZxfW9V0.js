import{f as n}from"./index-aA1Q6uWB.js";import{L as N}from"./LinkPreviewCard-L_kXFWLG.js";import"./jsx-runtime-D_zvdyIk.js";import"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";const i={url:"https://example.com/article",title:"Understanding Modern Web Development",description:"A comprehensive guide to building web applications with the latest tools and frameworks.",image:"https://picsum.photos/seed/link-preview/600/300",siteName:"Example Blog",favicon:"https://www.google.com/favicon.ico"},M={title:"Messaging/LinkPreviewCard",component:N,parameters:{layout:"centered",docs:{description:{component:"Card displaying Open Graph link preview data with optional dismiss button and compact mode."}}},tags:["autodocs"]},e={args:{preview:i,onDismiss:n()}},s={args:{preview:i,onDismiss:n(),compact:!0}},r={args:{preview:i}},a={args:{preview:{url:"https://example.com",title:"Example Page",description:null,image:null,siteName:null,favicon:null},onDismiss:n()}},o={args:{preview:{...i,image:null},onDismiss:n()}};var t,m,p;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
  args: {
    preview: fullPreview,
    onDismiss: fn()
  }
}`,...(p=(m=e.parameters)==null?void 0:m.docs)==null?void 0:p.source}}};var c,l,u;s.parameters={...s.parameters,docs:{...(c=s.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    preview: fullPreview,
    onDismiss: fn(),
    compact: true
  }
}`,...(u=(l=s.parameters)==null?void 0:l.docs)==null?void 0:u.source}}};var d,g,w;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    preview: fullPreview
  }
}`,...(w=(g=r.parameters)==null?void 0:g.docs)==null?void 0:w.source}}};var v,f,D;a.parameters={...a.parameters,docs:{...(v=a.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    preview: {
      url: 'https://example.com',
      title: 'Example Page',
      description: null,
      image: null,
      siteName: null,
      favicon: null
    },
    onDismiss: fn()
  }
}`,...(D=(f=a.parameters)==null?void 0:f.docs)==null?void 0:D.source}}};var h,P,x;o.parameters={...o.parameters,docs:{...(h=o.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    preview: {
      ...fullPreview,
      image: null
    },
    onDismiss: fn()
  }
}`,...(x=(P=o.parameters)==null?void 0:P.docs)==null?void 0:x.source}}};const L=["Default","Compact","NoDismiss","MinimalData","NoImage"];export{s as Compact,e as Default,a as MinimalData,r as NoDismiss,o as NoImage,L as __namedExportsOrder,M as default};
