import{P as Y}from"./PresenceLabel-DJXH6wOk.js";import"./jsx-runtime-EKYJJIwR.js";const F={title:"Messaging/PresenceLabel",component:Y,parameters:{layout:"centered",docs:{description:{component:"Text label showing a user's online status or last seen time. Supports an optional coloured dot. Formats last-seen intelligently: seconds, minutes, hours, or date/time."}}},tags:["autodocs"]},e={args:{info:{status:"online",lastSeen:null},showDot:!0,dotSize:"sm"}},s={args:{info:{status:"away",lastSeen:null},showDot:!0,dotSize:"sm"}},n={args:{info:{status:"offline",lastSeen:new Date(Date.now()-900*1e3)},showDot:!0,dotSize:"sm"}},t={args:{info:{status:"offline",lastSeen:new Date(Date.now()-2*3600*1e3)},showDot:!0,dotSize:"sm"}},o={args:{info:{status:"offline",lastSeen:new Date(Date.now()-25*3600*1e3)},showDot:!0,dotSize:"sm"}},a={args:{info:{status:"online",lastSeen:null},showDot:!1,dotSize:"sm"}},r={args:{info:{status:"online",lastSeen:null},showDot:!0,dotSize:"md"}},i={name:"Hidden Status (blank)",args:{info:{status:"offline",lastSeen:null,hidden:!0},showDot:!1,dotSize:"sm"}};var l,u,c;e.parameters={...e.parameters,docs:{...(l=e.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    info: {
      status: 'online',
      lastSeen: null
    },
    showDot: true,
    dotSize: 'sm'
  }
}`,...(c=(u=e.parameters)==null?void 0:u.docs)==null?void 0:c.source}}};var d,m,S;s.parameters={...s.parameters,docs:{...(d=s.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    info: {
      status: 'away',
      lastSeen: null
    },
    showDot: true,
    dotSize: 'sm'
  }
}`,...(S=(m=s.parameters)==null?void 0:m.docs)==null?void 0:S.source}}};var p,f,g;n.parameters={...n.parameters,docs:{...(p=n.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    info: {
      status: 'offline',
      lastSeen: new Date(Date.now() - 15 * 60 * 1000)
    },
    showDot: true,
    dotSize: 'sm'
  }
}`,...(g=(f=n.parameters)==null?void 0:f.docs)==null?void 0:g.source}}};var w,D,h;t.parameters={...t.parameters,docs:{...(w=t.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    info: {
      status: 'offline',
      lastSeen: new Date(Date.now() - 2 * 3600 * 1000)
    },
    showDot: true,
    dotSize: 'sm'
  }
}`,...(h=(D=t.parameters)==null?void 0:D.docs)==null?void 0:h.source}}};var z,L,y;o.parameters={...o.parameters,docs:{...(z=o.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    info: {
      status: 'offline',
      lastSeen: new Date(Date.now() - 25 * 3600 * 1000)
    },
    showDot: true,
    dotSize: 'sm'
  }
}`,...(y=(L=o.parameters)==null?void 0:L.docs)==null?void 0:y.source}}};var A,H,b;a.parameters={...a.parameters,docs:{...(A=a.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    info: {
      status: 'online',
      lastSeen: null
    },
    showDot: false,
    dotSize: 'sm'
  }
}`,...(b=(H=a.parameters)==null?void 0:H.docs)==null?void 0:b.source}}};var x,M,O;r.parameters={...r.parameters,docs:{...(x=r.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    info: {
      status: 'online',
      lastSeen: null
    },
    showDot: true,
    dotSize: 'md'
  }
}`,...(O=(M=r.parameters)==null?void 0:M.docs)==null?void 0:O.source}}};var P,k,N;i.parameters={...i.parameters,docs:{...(P=i.parameters)==null?void 0:P.docs,source:{originalSource:`{
  name: 'Hidden Status (blank)',
  args: {
    info: {
      status: 'offline',
      lastSeen: null,
      hidden: true
    },
    showDot: false,
    dotSize: 'sm'
  }
}`,...(N=(k=i.parameters)==null?void 0:k.docs)==null?void 0:N.source}}};const T=["Online","Away","LastSeenMinutesAgo","LastSeenHoursAgo","LastSeenYesterday","NoDot","LargeDot","Hidden"];export{s as Away,i as Hidden,r as LargeDot,t as LastSeenHoursAgo,n as LastSeenMinutesAgo,o as LastSeenYesterday,a as NoDot,e as Online,T as __namedExportsOrder,F as default};
