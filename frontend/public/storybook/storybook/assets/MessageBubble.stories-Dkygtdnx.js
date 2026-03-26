import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{r as o}from"./index-BRD0Ja2P.js";import{M as ie}from"./MessageBubble-B55Y01Vt.js";import{e as fe}from"./extractWaveform-MvnON043.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";import"./index-DM5NKCPS.js";import"./index-CJs3qScs.js";import"./MessageAudioPlayer-BM_uUdgA.js";import"./db-0SialWBz.js";import"./imageUrl-CsZUsNgt.js";import"./aiBot-ZEtwtFF4.js";import"./CodeBlock-CnAQt0LJ.js";import"./LinkPreviewCard-LVDt6hUj.js";import"./api-BCYJxCpV.js";const ke={title:"Messaging/MessageBubble",component:ie,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Renders a list of direct messages with support for text, image, file, audio, reactions, replies, edit history, and unsent states."}}}},M=new Date("2026-01-15T14:30:00Z"),he=new Date("2026-01-15T14:28:00Z"),xe=new Date("2026-01-15T14:25:00Z"),r={id:"1",content:"Hey! How are you doing?",senderId:"me",recipientId:"them",direction:"sent",status:"read",timestamp:xe,type:"text",senderDisplayName:"You"},n={id:"2",content:"I'm doing great, thanks for asking! What about you?",senderId:"them",senderDisplayName:"Alice",senderUsername:"@alice",senderProfileImage:"/profile/default-profile.jpg",recipientId:"me",direction:"received",status:"delivered",timestamp:he,type:"text"};function s(a){const t=o.useRef(null),{minHeight:v="400px",...j}=a;return e.jsxs("div",{style:{maxWidth:"680px",margin:"0 auto",padding:"1rem",minHeight:v},children:[e.jsx(ie,{messages:[r,n],currentUserId:"me",messagesEndRef:t,onImageClick:()=>{},onAudioPlayStatusChange:()=>{},listeningMessageIds:new Set,...j}),e.jsx("div",{ref:t})]})}const i={render:()=>e.jsx(s,{})},c={render:()=>e.jsx(s,{messages:[r,n,{...r,id:"3",content:"All good here too 😊",timestamp:M,status:"delivered"}]})},d={render:()=>e.jsx(s,{messages:[{...r,reactions:[{userId:"them",username:"@alice",emoji:"❤️"},{userId:"other",username:"@bob",emoji:"😂"}]},n]})},m={render:()=>e.jsx(s,{messages:[r,{...n,id:"3",content:"Replying to that!",replyTo:{id:r.id,content:r.content,senderUsername:"@you"}}]})},p={render:()=>e.jsx(s,{messages:[{...r,type:"image",content:"photo.jpg",fileUrl:"/cover/default-cover.jpg",fileName:"default-cover.jpg",fileType:"image/jpeg"}]})},g={render:()=>e.jsx(s,{messages:[{...r,type:"file",content:"report.pdf",fileUrl:"/uploads/report.pdf",fileName:"report.pdf",fileSize:204800,fileType:"application/pdf"}]})},u={render:()=>e.jsx(s,{messages:[{...r,content:"This message was edited ✏️",edited:!0,editedAt:M}]})},l={render:()=>e.jsx(s,{messages:[{...r,content:"",unsent:!0},n]})},f={render:()=>e.jsx(s,{messages:[r,n],isRecipientTyping:!0,minHeight:"500px"})},h={render:()=>e.jsx(s,{messages:[r,n],isRecipientRecording:!0,minHeight:"500px"})},x={render:()=>e.jsx(s,{messages:Array.from({length:12},(a,t)=>({...t%2===0?r:n,id:String(t+1),content:t%2===0?`Sent message ${Math.ceil((t+1)/2)}: Lorem ipsum dolor sit amet.`:`Received message ${Math.ceil((t+1)/2)}: Consectetur adipiscing elit.`,timestamp:new Date(M.getTime()-(12-t)*6e4)})),minHeight:"600px"})};function ye(){const[a,t]=o.useState([]),[v,j]=o.useState(12),[ce,B]=o.useState(!0);if(o.useEffect(()=>{let S=!1;async function me(){try{const pe=await(await fetch("/audio/I%20look%20in%20the%20mirror%20(Acoustic%20Mix).mp3")).blob(),ge=new File([pe],"I look in the mirror (Acoustic Mix).mp3",{type:"audio/mpeg"}),{waveform:ue,duration:le}=await fe(ge);S||(t(ue),j(Math.round(le)),B(!1))}catch(I){console.error("Failed to generate waveform for story:",I),S||B(!1)}}return me(),()=>{S=!0}},[]),ce||a.length===0)return e.jsx("div",{style:{maxWidth:"680px",margin:"0 auto",padding:"1rem",minHeight:"300px",color:"#94a3b8"},children:"Generating waveform…"});const de={...r,type:"audio",content:"I look in the mirror (Acoustic Mix).mp3",fileUrl:"/audio/I%20look%20in%20the%20mirror%20(Acoustic%20Mix).mp3",fileName:"I look in the mirror (Acoustic Mix).mp3",fileType:"audio/mpeg",duration:v,waveformData:a};return e.jsx(s,{messages:[de],minHeight:"400px"})}const y={render:()=>e.jsx(ye,{})};var W,w,R;i.parameters={...i.parameters,docs:{...(W=i.parameters)==null?void 0:W.docs,source:{originalSource:`{
  render: () => <Wrapper />
}`,...(R=(w=i.parameters)==null?void 0:w.docs)==null?void 0:R.source}}};var A,T,b;c.parameters={...c.parameters,docs:{...(A=c.parameters)==null?void 0:A.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[sentBase, receivedBase, {
    ...sentBase,
    id: '3',
    content: 'All good here too 😊',
    timestamp: now,
    status: 'delivered'
  }]} />
}`,...(b=(T=c.parameters)==null?void 0:T.docs)==null?void 0:b.source}}};var H,U,D;d.parameters={...d.parameters,docs:{...(H=d.parameters)==null?void 0:H.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[{
    ...sentBase,
    reactions: [{
      userId: 'them',
      username: '@alice',
      emoji: '❤️'
    }, {
      userId: 'other',
      username: '@bob',
      emoji: '😂'
    }]
  }, receivedBase]} />
}`,...(D=(U=d.parameters)==null?void 0:U.docs)==null?void 0:D.source}}};var k,C,E;m.parameters={...m.parameters,docs:{...(k=m.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[sentBase, {
    ...receivedBase,
    id: '3',
    content: 'Replying to that!',
    replyTo: {
      id: sentBase.id,
      content: sentBase.content,
      senderUsername: '@you'
    }
  }]} />
}`,...(E=(C=m.parameters)==null?void 0:C.docs)==null?void 0:E.source}}};var N,F,L;p.parameters={...p.parameters,docs:{...(N=p.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[{
    ...sentBase,
    type: 'image',
    content: 'photo.jpg',
    fileUrl: '/cover/default-cover.jpg',
    fileName: 'default-cover.jpg',
    fileType: 'image/jpeg'
  }]} />
}`,...(L=(F=p.parameters)==null?void 0:F.docs)==null?void 0:L.source}}};var _,$,Z;g.parameters={...g.parameters,docs:{...(_=g.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[{
    ...sentBase,
    type: 'file',
    content: 'report.pdf',
    fileUrl: '/uploads/report.pdf',
    fileName: 'report.pdf',
    fileSize: 204800,
    fileType: 'application/pdf'
  }]} />
}`,...(Z=($=g.parameters)==null?void 0:$.docs)==null?void 0:Z.source}}};var z,P,G;u.parameters={...u.parameters,docs:{...(z=u.parameters)==null?void 0:z.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[{
    ...sentBase,
    content: 'This message was edited ✏️',
    edited: true,
    editedAt: now
  }]} />
}`,...(G=(P=u.parameters)==null?void 0:P.docs)==null?void 0:G.source}}};var O,Y,q;l.parameters={...l.parameters,docs:{...(O=l.parameters)==null?void 0:O.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[{
    ...sentBase,
    content: '',
    unsent: true
  }, receivedBase]} />
}`,...(q=(Y=l.parameters)==null?void 0:Y.docs)==null?void 0:q.source}}};var J,K,Q;f.parameters={...f.parameters,docs:{...(J=f.parameters)==null?void 0:J.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[sentBase, receivedBase]} isRecipientTyping={true} minHeight="500px" />
}`,...(Q=(K=f.parameters)==null?void 0:K.docs)==null?void 0:Q.source}}};var V,X,ee;h.parameters={...h.parameters,docs:{...(V=h.parameters)==null?void 0:V.docs,source:{originalSource:`{
  render: () => <Wrapper messages={[sentBase, receivedBase]} isRecipientRecording={true} minHeight="500px" />
}`,...(ee=(X=h.parameters)==null?void 0:X.docs)==null?void 0:ee.source}}};var re,se,te;x.parameters={...x.parameters,docs:{...(re=x.parameters)==null?void 0:re.docs,source:{originalSource:`{
  render: () => <Wrapper messages={Array.from({
    length: 12
  }, (_, i) => ({
    ...(i % 2 === 0 ? sentBase : receivedBase),
    id: String(i + 1),
    content: i % 2 === 0 ? \`Sent message \${Math.ceil((i + 1) / 2)}: Lorem ipsum dolor sit amet.\` : \`Received message \${Math.ceil((i + 1) / 2)}: Consectetur adipiscing elit.\`,
    timestamp: new Date(now.getTime() - (12 - i) * 60000)
  }))} minHeight="600px" />
}`,...(te=(se=x.parameters)==null?void 0:se.docs)==null?void 0:te.source}}};var ne,ae,oe;y.parameters={...y.parameters,docs:{...(ne=y.parameters)==null?void 0:ne.docs,source:{originalSource:`{
  render: () => <AudioWaveformStory />
}`,...(oe=(ae=y.parameters)==null?void 0:ae.docs)==null?void 0:oe.source}}};const Ce=["Conversation","SentAndReceived","WithReactions","WithReply","ImageMessage","FileMessage","EditedMessage","UnsentMessage","TypingIndicator","RecordingIndicator","LongConversation","AudioMessage"];export{y as AudioMessage,i as Conversation,u as EditedMessage,g as FileMessage,p as ImageMessage,x as LongConversation,h as RecordingIndicator,c as SentAndReceived,f as TypingIndicator,l as UnsentMessage,d as WithReactions,m as WithReply,Ce as __namedExportsOrder,ke as default};
