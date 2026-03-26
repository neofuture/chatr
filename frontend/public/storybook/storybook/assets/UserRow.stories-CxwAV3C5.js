import{R as w}from"./index-BRD0Ja2P.js";import{f as e}from"./index-aA1Q6uWB.js";import{U as L}from"./UserRow-BX45oLtC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";import"./jsx-runtime-EKYJJIwR.js";import"./PresenceAvatar-DVFcre1K.js";import"./imageUrl-CsZUsNgt.js";const _={title:"Common/UserRow",component:L,parameters:{layout:"centered",docs:{description:{component:"Reusable user row with avatar, name, subtitle, presence dot, and optional badges/actions."}}},tags:["autodocs"]},a={args:{profileImage:null,displayName:"Jane Doe",onClick:e()}},n={args:{profileImage:"https://i.pravatar.cc/80?u=online",displayName:"Alice Chen",presence:{status:"online",lastSeen:null},onClick:e()}},r={args:{profileImage:"https://i.pravatar.cc/80?u=subtitle",displayName:"Bob Smith",subtitle:"Last seen 5 minutes ago",onClick:e()}},s={args:{profileImage:"https://i.pravatar.cc/80?u=badge",displayName:"Carol Admin",badges:w.createElement("span",{style:{background:"#3b82f6",color:"#fff",padding:"2px 6px",borderRadius:4,fontSize:11,fontWeight:600}},"Admin"),onClick:e()}},t={args:{profileImage:"https://i.pravatar.cc/80?u=actions",displayName:"Dave Wilson",actions:w.createElement("button",{style:{background:"#3b82f6",color:"#fff",border:"none",padding:"4px 12px",borderRadius:6,cursor:"pointer",fontSize:12}},"Add Friend"),onClick:e()}},o={args:{profileImage:"https://i.pravatar.cc/80?u=friend",displayName:"Eve Martinez",isFriend:!0,presence:{status:"online",lastSeen:null},onClick:e()}},i={args:{profileImage:"https://i.pravatar.cc/112?u=large",displayName:"Frank Lee",avatarSize:56,presence:{status:"online",lastSeen:null},onClick:e()}},c={args:{profileImage:"https://i.pravatar.cc/80?u=nodot",displayName:"Grace Kim",showPresenceDot:!1,onClick:e()}};var p,l,m;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    profileImage: null,
    displayName: 'Jane Doe',
    onClick: fn()
  }
}`,...(m=(l=a.parameters)==null?void 0:l.docs)==null?void 0:m.source}}};var d,u,g;n.parameters={...n.parameters,docs:{...(d=n.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=online',
    displayName: 'Alice Chen',
    presence: {
      status: 'online' as const,
      lastSeen: null
    },
    onClick: fn()
  }
}`,...(g=(u=n.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};var f,b,h;r.parameters={...r.parameters,docs:{...(f=r.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=subtitle',
    displayName: 'Bob Smith',
    subtitle: 'Last seen 5 minutes ago',
    onClick: fn()
  }
}`,...(h=(b=r.parameters)==null?void 0:b.docs)==null?void 0:h.source}}};var S,v,k;s.parameters={...s.parameters,docs:{...(S=s.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=badge',
    displayName: 'Carol Admin',
    badges: React.createElement('span', {
      style: {
        background: '#3b82f6',
        color: '#fff',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600
      }
    }, 'Admin'),
    onClick: fn()
  }
}`,...(k=(v=s.parameters)==null?void 0:v.docs)==null?void 0:k.source}}};var y,C,N;t.parameters={...t.parameters,docs:{...(y=t.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=actions',
    displayName: 'Dave Wilson',
    actions: React.createElement('button', {
      style: {
        background: '#3b82f6',
        color: '#fff',
        border: 'none',
        padding: '4px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12
      }
    }, 'Add Friend'),
    onClick: fn()
  }
}`,...(N=(C=t.parameters)==null?void 0:C.docs)==null?void 0:N.source}}};var I,A,R;o.parameters={...o.parameters,docs:{...(I=o.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=friend',
    displayName: 'Eve Martinez',
    isFriend: true,
    presence: {
      status: 'online' as const,
      lastSeen: null
    },
    onClick: fn()
  }
}`,...(R=(A=o.parameters)==null?void 0:A.docs)==null?void 0:R.source}}};var x,D,W;i.parameters={...i.parameters,docs:{...(x=i.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    profileImage: 'https://i.pravatar.cc/112?u=large',
    displayName: 'Frank Lee',
    avatarSize: 56,
    presence: {
      status: 'online' as const,
      lastSeen: null
    },
    onClick: fn()
  }
}`,...(W=(D=i.parameters)==null?void 0:D.docs)==null?void 0:W.source}}};var z,F,E;c.parameters={...c.parameters,docs:{...(z=c.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=nodot',
    displayName: 'Grace Kim',
    showPresenceDot: false,
    onClick: fn()
  }
}`,...(E=(F=c.parameters)==null?void 0:F.docs)==null?void 0:E.source}}};const j=["Default","Online","WithSubtitle","WithBadge","WithActions","Friend","LargeAvatar","NoDot"];export{a as Default,o as Friend,i as LargeAvatar,c as NoDot,n as Online,t as WithActions,s as WithBadge,r as WithSubtitle,j as __namedExportsOrder,_ as default};
