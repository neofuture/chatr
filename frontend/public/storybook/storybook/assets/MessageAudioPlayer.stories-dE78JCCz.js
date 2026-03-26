import{M as I}from"./MessageAudioPlayer-BM_uUdgA.js";import"./jsx-runtime-EKYJJIwR.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";import"./db-0SialWBz.js";import"./imageUrl-CsZUsNgt.js";const x={title:"Messaging/MessageAudioPlayer",component:I,parameters:{layout:"centered",docs:{description:{component:"Waveform audio player for voice messages. Renders a bar-graph waveform with play/pause and scrubbing support."}}},tags:["autodocs"]},n=Array.from({length:60},(M,a)=>Math.abs(Math.sin(a*.3)*.7+Math.sin(a*.7)*.3)),e={args:{audioUrl:"/audio/sample.mp3",duration:12,waveformData:n,isSent:!0,timestamp:new Date,messageId:"story-1"}},r={args:{audioUrl:"/audio/sample.mp3",duration:8,waveformData:n,isSent:!1,timestamp:new Date,messageId:"story-2"}},s={args:{audioUrl:"/audio/sample.mp3",duration:94,waveformData:Array.from({length:120},(M,a)=>Math.abs(Math.sin(a*.15)*.9+Math.random()*.1)),isSent:!0,timestamp:new Date,messageId:"story-3"}},t={args:{audioUrl:"/audio/sample.mp3",duration:6,waveformData:Array.from({length:30},()=>Math.random()*.8+.1),isSent:!0,status:"delivered",timestamp:new Date,messageId:"story-4"}},o={args:{audioUrl:"/audio/sample.mp3",duration:10,waveformData:n,isSent:!0,isListening:!0,status:"delivered",timestamp:new Date,messageId:"story-5"}};var m,i,d;e.parameters={...e.parameters,docs:{...(m=e.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 12,
    waveformData: sampleWaveform,
    isSent: true,
    timestamp: new Date(),
    messageId: 'story-1'
  }
}`,...(d=(i=e.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};var p,u,c;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 8,
    waveformData: sampleWaveform,
    isSent: false,
    timestamp: new Date(),
    messageId: 'story-2'
  }
}`,...(c=(u=r.parameters)==null?void 0:u.docs)==null?void 0:c.source}}};var l,g,f;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 94,
    waveformData: Array.from({
      length: 120
    }, (_, i) => Math.abs(Math.sin(i * 0.15) * 0.9 + Math.random() * 0.1)),
    isSent: true,
    timestamp: new Date(),
    messageId: 'story-3'
  }
}`,...(f=(g=s.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var v,w,h;t.parameters={...t.parameters,docs:{...(v=t.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 6,
    waveformData: Array.from({
      length: 30
    }, () => Math.random() * 0.8 + 0.1),
    isSent: true,
    status: 'delivered',
    timestamp: new Date(),
    messageId: 'story-4'
  }
}`,...(h=(w=t.parameters)==null?void 0:w.docs)==null?void 0:h.source}}};var y,D,S;o.parameters={...o.parameters,docs:{...(y=o.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 10,
    waveformData: sampleWaveform,
    isSent: true,
    isListening: true,
    status: 'delivered',
    timestamp: new Date(),
    messageId: 'story-5'
  }
}`,...(S=(D=o.parameters)==null?void 0:D.docs)==null?void 0:S.source}}};const P=["Sent","Received","LongRecording","WithStatus","RecipientListening"];export{s as LongRecording,r as Received,o as RecipientListening,e as Sent,t as WithStatus,P as __namedExportsOrder,x as default};
