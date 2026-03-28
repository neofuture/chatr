import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as p}from"./index-CAPI2NOD.js";import{u,P as Qe}from"./PanelContext-B2ahxC0Z.js";import{r as Ye}from"./index-DvGSVeov.js";import{g as Ze}from"./profileImageService-BTi6sIGk.js";import{u as Ue}from"./PresenceContext-BWlDdNCb.js";import{P as et}from"./PresenceLabel-DCOxiJDL.js";import{P as N}from"./PresenceAvatar-D7II4iv7.js";import{P as tt}from"./PanelFooter-B5fBeaET.js";import{i as Je}from"./aiBot-ZEtwtFF4.js";import{r as nt}from"./imageUrl-CsZUsNgt.js";import{B as d}from"./Button-DQiR6Pwv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-Qoh0vY4V.js";import"./db-0SialWBz.js";import"./api-BCYJxCpV.js";import"./WebSocketContext-qIZAPD--.js";import"./LogContext-c9znKTs6.js";import"./ThemeContext-VTc29vLE.js";const lt="_titleBlock_zoitq_148",st="_titleBlockCenter_zoitq_154",rt="_titleBlockLeft_zoitq_161",it="_titleText_zoitq_177",ot="_titleName_zoitq_185",at="_titleSub_zoitq_189",ct="_titleSubText_zoitq_196",ut="_actions_zoitq_202",dt="_actionBtn_zoitq_213",pt="_menuWrap_zoitq_231",mt="_submenu_zoitq_236",ft="_submenuItem_zoitq_254",ht="_submenuItemDanger_zoitq_289",o={titleBlock:lt,titleBlockCenter:st,titleBlockLeft:rt,titleText:it,titleName:ot,titleSub:at,titleSubText:ct,actions:ut,actionBtn:dt,menuWrap:pt,submenu:mt,submenuItem:ft,submenuItemDanger:ht};function $e(t){return!!t.hidden||t.status==="offline"&&!t.lastSeen}function gt({panelId:t,profileImage:n,title:i,isGuest:l}){const{getPresence:s}=Ue(),h=t.startsWith("group-"),P=t.startsWith("chat-")?t.slice(5):null;if(h)return e.jsx(N,{displayName:i,profileImage:n??null,info:{status:"offline",lastSeen:null},size:36,showDot:!1,isGroup:!0});if(!P)return n?e.jsx("img",{src:nt(n)||n,alt:i}):null;const y=Je(P),g=s(P),W=y?{status:"online",lastSeen:null}:$e(g)?{status:"offline",lastSeen:null,hidden:!0}:g;return e.jsx(N,{displayName:i,profileImage:n,info:W,size:36,isBot:y,isGuest:l,showDot:!y&&!l})}function vt({panelId:t,staticSubTitle:n}){const{getPresence:i}=Ue(),l=t.startsWith("chat-")?t.slice(5):null;if(!l)return n?e.jsx("div",{className:o.titleSub,children:e.jsx("span",{className:o.titleSubText,children:n})}):null;if(Je(l))return e.jsx("div",{className:o.titleSub,children:e.jsx("span",{className:o.titleSubText,style:{color:"#a78bfa"},children:"AI Assistant · Always online"})});const s=i(l);return $e(s)?null:e.jsx("div",{className:o.titleSub,children:e.jsx("span",{className:o.titleSubText,children:e.jsx(et,{info:s,showDot:!1})})})}function Pt({id:t,title:n,children:i,level:l,effectiveMaxLevel:s,isClosing:h,titlePosition:P="center",subTitle:y,profileImage:g,fullWidth:W=!1,actionIcons:q,footer:E,isGuest:Ke}){const{closePanel:He}=u(),[M,R]=p.useState(!1),[v,x]=p.useState(g),[j,C]=p.useState(null),[z,b]=p.useState(null),F=p.useRef(null),U=p.useRef([]);p.useEffect(()=>{g==="use-auth-user"?(async()=>{try{const a=localStorage.getItem("user");if(a){const c=JSON.parse(a),f=await Ze(c.id);x(f||"/profile/default-profile.jpg")}else x("/profile/default-profile.jpg")}catch(a){console.error("Failed to load panel profile image:",a),x("/profile/default-profile.jpg")}})():x(g)},[g]);const Xe=l<s;p.useEffect(()=>{if(j===null)return;const r=a=>{const c=a.target;if(F.current&&F.current.contains(c))return;const f=document.querySelector(`.${o.submenu}`);f&&f.contains(c)||(C(null),b(null))};return document.addEventListener("mousedown",r),()=>document.removeEventListener("mousedown",r)},[j]),p.useEffect(()=>{if(h){R(!1),C(null),b(null);return}const r=setTimeout(()=>{R(!0)},10);return()=>clearTimeout(r)},[h]);const J=()=>{He(t)},$=9999+l;let A;return M?Xe?A="translateX(-50%) scale(0.9)":A="translateX(0) scale(1)":A="translateX(100%)",e.jsxs(e.Fragment,{children:[e.jsx("div",{className:`auth-panel-backdrop ${M&&!h?"active":""}`,onClick:J,onTouchMove:r=>r.preventDefault(),onWheel:r=>r.preventDefault(),style:{zIndex:$-1}}),e.jsxs("div",{className:"auth-panel","data-fullwidth":W?"true":void 0,style:{zIndex:$,transform:A,transformOrigin:"center right",transition:"transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",...W&&{width:"100vw",maxWidth:"100vw",left:0,right:0}},children:[e.jsxs("div",{className:"auth-panel-header",children:[e.jsx("button",{onClick:J,className:"auth-panel-back",children:"‹"}),e.jsxs("div",{className:`auth-panel-title ${P==="center"?o.titleBlockCenter:o.titleBlockLeft} ${o.titleBlock}`,style:{gap:"0.75rem",cursor:t.startsWith("group-")&&!t.startsWith("group-profile-")||t.startsWith("chat-")?"pointer":void 0},onClick:()=>{if(t.startsWith("group-")&&!t.startsWith("group-profile-")){const r=t.replace("group-","");window.dispatchEvent(new CustomEvent("chatr:group-profile-open",{detail:{groupId:r}}))}else if(t.startsWith("chat-")){const r=t.slice(5);window.dispatchEvent(new CustomEvent("chatr:user-profile-open",{detail:{userId:r,title:n,profileImage:v}}))}},children:[(()=>{const r=t.startsWith("chat-")?t.slice(5):null,a=t.startsWith("group-"),c=t.startsWith("user-profile-");return r||a?e.jsx(gt,{panelId:t,profileImage:v,title:n,isGuest:Ke}):c&&v?e.jsx(N,{displayName:n,profileImage:v,info:{status:"offline",lastSeen:null},size:36,showDot:!1}):v?e.jsx(N,{displayName:n,profileImage:v,info:{status:"offline",lastSeen:null},size:36,showDot:!1}):null})(),e.jsxs("div",{className:o.titleText,children:[e.jsx("span",{className:o.titleName,children:n}),e.jsx(vt,{panelId:t,staticSubTitle:y})]})]}),e.jsx("div",{className:o.actions,ref:F,children:q&&q.map((r,a)=>r.submenu&&r.submenu.length>0?e.jsxs("div",{className:o.menuWrap,children:[e.jsx("button",{ref:c=>{U.current[a]=c},onClick:()=>{if(j===a)C(null),b(null);else{const c=U.current[a];if(c){const f=c.getBoundingClientRect(),G=c.closest(".auth-panel-header"),Ve=G?G.getBoundingClientRect().bottom:f.bottom;b({top:Ve+4,right:window.innerWidth-f.right})}C(a)}},"aria-label":r.label||"Menu","aria-expanded":j===a,className:o.actionBtn,children:e.jsx("i",{className:r.icon})}),j===a&&z&&Ye.createPortal(e.jsx("div",{className:o.submenu,style:{top:z.top,right:z.right},children:r.submenu.map((c,f)=>e.jsxs("button",{className:`${o.submenuItem} ${c.variant==="danger"?o.submenuItemDanger:""}`,onClick:()=>{c.onClick(),C(null),b(null)},children:[e.jsx("i",{className:c.icon}),e.jsx("span",{children:c.label})]},f))}),document.body)]},a):e.jsx("button",{onClick:r.onClick,"aria-label":r.label,className:o.actionBtn,children:e.jsx("i",{className:r.icon})},a))})]}),e.jsx("div",{className:"auth-panel-content",children:i}),E&&e.jsx(tt,{children:E()})]})]})}function Ge(){const{panels:t,maxLevel:n,effectiveMaxLevel:i}=u();return t.length===0?null:e.jsx(e.Fragment,{children:t.map(l=>e.jsx(Pt,{id:l.id,title:l.title,level:l.level,maxLevel:n,effectiveMaxLevel:i,isClosing:l.isClosing,titlePosition:l.titlePosition,subTitle:l.subTitle,profileImage:l.profileImage,fullWidth:l.fullWidth,actionIcons:l.actionIcons,footer:l.footer,isGuest:l.isGuest,children:l.component},l.id))})}Ge.__docgenInfo={description:"",methods:[],displayName:"PanelContainer"};const Ft={title:"Panels/PanelContainer",tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"\nPanelContainer renders slide-in panels managed by PanelContext.\n\n**Panel config options:**\n- `title` — header title text\n- `titlePosition` — `'center'` | `'left'` | `'right'`\n- `subTitle` — small subtitle below the title (animates in/out)\n- `profileImage` — avatar shown in the title bar (URL or `'use-auth-user'`)\n- `fullWidth` — `true` makes the panel cover the full viewport width\n- `actionIcons` — array of `{ icon, onClick, label }` icon buttons in the header\n- Multiple panels stack with depth animation (covered panel slides left + scales down)\n        "}}},decorators:[t=>e.jsx(Qe,{children:e.jsxs("div",{style:{width:"100vw",height:"100vh",background:"#0f172a",position:"relative",overflow:"hidden"},children:[e.jsx(t,{}),e.jsx(Ge,{})]})})]};function m({title:t}){return e.jsxs("div",{style:{padding:"1.5rem",color:"#e2e8f0"},children:[e.jsx("h3",{style:{color:"#93c5fd",marginBottom:"1rem"},children:t}),e.jsx("p",{style:{opacity:.7,lineHeight:1.6},children:"This is the panel body content. Panels slide in from the right and can be dismissed by tapping the back button or the backdrop."}),e.jsxs("ul",{style:{marginTop:"1rem",opacity:.6,paddingLeft:"1.25rem",lineHeight:2},children:[e.jsx("li",{children:"Item one"}),e.jsx("li",{children:"Item two"}),e.jsx("li",{children:"Item three"})]})]})}const k={render:()=>{function t(){const{openPanel:n}=u();return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"},children:e.jsx(d,{variant:"primary",onClick:()=>n("basic",e.jsx(m,{title:"Basic Panel"}),"Basic Panel"),children:"Open Basic Panel"})})}return e.jsx(t,{})}},B={render:()=>{function t(){const{openPanel:n}=u();return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"},children:e.jsx(d,{variant:"primary",onClick:()=>n("left",e.jsx(m,{title:"Left Title Panel"}),"Settings","left"),children:"Open Left-Title Panel"})})}return e.jsx(t,{})}},w={render:()=>{function t(){const{openPanel:n}=u();return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"},children:e.jsx(d,{variant:"primary",onClick:()=>n("sub",e.jsx(m,{title:"Profile Panel"}),"Alice Johnson","left","Online"),children:"Open Panel with Subtitle"})})}return e.jsx(t,{})}},S={render:()=>{function t(){const{openPanel:n}=u();return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"},children:e.jsx(d,{variant:"primary",onClick:()=>n("profile",e.jsx(m,{title:"User Profile"}),"Alice Johnson","left","Last seen today at 14:32","/profile/default-profile.jpg"),children:"Open Panel with Avatar"})})}return e.jsx(t,{})}},L={render:()=>{function t(){const{openPanel:n}=u(),[i,l]=p.useState([]);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:"1rem"},children:[e.jsx(d,{variant:"primary",onClick:()=>n("actions",e.jsx(m,{title:"Panel with Actions"}),"Conversation","left",void 0,void 0,void 0,[{icon:"fad fa-trash",label:"Delete",onClick:()=>l(s=>[...s,"Delete clicked"])},{icon:"fad fa-list",label:"Logs",onClick:()=>l(s=>[...s,"Logs clicked"])}]),children:"Open Panel with Action Icons"}),i.length>0&&e.jsx("div",{style:{color:"#93c5fd",fontSize:"0.8rem"},children:i.slice(-3).map((s,h)=>e.jsx("div",{children:s},h))})]})}return e.jsx(t,{})}},I={render:()=>{function t(){const{openPanel:n}=u();return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"},children:e.jsx(d,{variant:"primary",onClick:()=>n("fw",e.jsx(m,{title:"Full Width Panel"}),"Full Width","center",void 0,void 0,!0),children:"Open Full-Width Panel"})})}return e.jsx(t,{})}},D={render:()=>{function t(){const{openPanel:i}=u();return e.jsxs("div",{style:{padding:"1.5rem",color:"#e2e8f0"},children:[e.jsx("p",{style:{opacity:.7,marginBottom:"1rem"},children:"This is panel one. Open a second panel on top."}),e.jsx(d,{variant:"primary",onClick:()=>i("panel2",e.jsx(m,{title:"Panel Two (stacked)"}),"Panel Two","center","Stacked on top"),children:"Open Second Panel"})]})}function n(){const{openPanel:i}=u();return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"},children:e.jsx(d,{variant:"primary",onClick:()=>i("panel1",e.jsx(t,{}),"Panel One","center"),children:"Open First Panel"})})}return e.jsx(n,{})}},T={render:()=>{function t(){return e.jsx(m,{title:"Level 3 — deepest panel"})}function n(){const{openPanel:s}=u();return e.jsxs("div",{style:{padding:"1.5rem",color:"#e2e8f0"},children:[e.jsx("p",{style:{opacity:.7,marginBottom:"1rem"},children:"Level 2 panel."}),e.jsx(d,{variant:"primary",onClick:()=>s("p3",e.jsx(t,{}),"Level 3","left","Deepest"),children:"Open Level 3"})]})}function i(){const{openPanel:s}=u();return e.jsxs("div",{style:{padding:"1.5rem",color:"#e2e8f0"},children:[e.jsx("p",{style:{opacity:.7,marginBottom:"1rem"},children:"Level 1 panel."}),e.jsx(d,{variant:"primary",onClick:()=>s("p2",e.jsx(n,{}),"Level 2","left","Middle layer"),children:"Open Level 2"})]})}function l(){const{openPanel:s}=u();return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"},children:e.jsx(d,{variant:"primary",onClick:()=>s("p1",e.jsx(i,{}),"Level 1","left"),children:"Open Level 1"})})}return e.jsx(l,{})}},_={render:()=>{function t(){const{openPanel:n}=u(),[i,l]=p.useState([]);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:"1rem"},children:[e.jsx(d,{variant:"primary",onClick:()=>n("ks",e.jsx(m,{title:"Full featured panel"}),"Alice Johnson","left","Active now","/profile/default-profile.jpg",!1,[{icon:"fad fa-trash",label:"Delete conversation",onClick:()=>l(s=>[...s,"Delete"])},{icon:"fad fa-list",label:"View logs",onClick:()=>l(s=>[...s,"Logs"])}]),children:"Open Kitchen Sink Panel"}),i.length>0&&e.jsx("div",{style:{color:"#93c5fd",fontSize:"0.8rem"},children:i.slice(-3).map((s,h)=>e.jsx("div",{children:s},h))})]})}return e.jsx(t,{})}},O={render:()=>{function t(){const{openPanel:n,closeAllPanels:i}=u();return e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",gap:"1rem",flexWrap:"wrap"},children:[e.jsx(d,{variant:"primary",onClick:()=>{n("ca1",e.jsx(m,{title:"Panel One"}),"Panel One"),setTimeout(()=>n("ca2",e.jsx(m,{title:"Panel Two"}),"Panel Two"),350)},children:"Open Two Panels"}),e.jsx(d,{variant:"danger",onClick:i,children:"Close All Panels"})]})}return e.jsx(t,{})}};var K,H,X,V,Q;k.parameters={...k.parameters,docs:{...(K=k.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: () => {
    function Demo() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
          <Button variant="primary" onClick={() => openPanel('basic', <PanelContent title="Basic Panel" />, 'Basic Panel')}>
            Open Basic Panel
          </Button>
        </div>;
    }
    return <Demo />;
  }
}`,...(X=(H=k.parameters)==null?void 0:H.docs)==null?void 0:X.source},description:{story:"Basic panel with centred title",...(Q=(V=k.parameters)==null?void 0:V.docs)==null?void 0:Q.description}}};var Y,Z,ee,te,ne;B.parameters={...B.parameters,docs:{...(Y=B.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  render: () => {
    function Demo() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
          <Button variant="primary" onClick={() => openPanel('left', <PanelContent title="Left Title Panel" />, 'Settings', 'left')}>
            Open Left-Title Panel
          </Button>
        </div>;
    }
    return <Demo />;
  }
}`,...(ee=(Z=B.parameters)==null?void 0:Z.docs)==null?void 0:ee.source},description:{story:"Title aligned to the left",...(ne=(te=B.parameters)==null?void 0:te.docs)==null?void 0:ne.description}}};var le,se,re,ie,oe;w.parameters={...w.parameters,docs:{...(le=w.parameters)==null?void 0:le.docs,source:{originalSource:`{
  render: () => {
    function Demo() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
          <Button variant="primary" onClick={() => openPanel('sub', <PanelContent title="Profile Panel" />, 'Alice Johnson', 'left', 'Online')}>
            Open Panel with Subtitle
          </Button>
        </div>;
    }
    return <Demo />;
  }
}`,...(re=(se=w.parameters)==null?void 0:se.docs)==null?void 0:re.source},description:{story:"Panel with a subtitle below the title",...(oe=(ie=w.parameters)==null?void 0:ie.docs)==null?void 0:oe.description}}};var ae,ce,ue,de,pe;S.parameters={...S.parameters,docs:{...(ae=S.parameters)==null?void 0:ae.docs,source:{originalSource:`{
  render: () => {
    function Demo() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
          <Button variant="primary" onClick={() => openPanel('profile', <PanelContent title="User Profile" />, 'Alice Johnson', 'left', 'Last seen today at 14:32', '/profile/default-profile.jpg')}>
            Open Panel with Avatar
          </Button>
        </div>;
    }
    return <Demo />;
  }
}`,...(ue=(ce=S.parameters)==null?void 0:ce.docs)==null?void 0:ue.source},description:{story:"Panel with a profile image in the title bar",...(pe=(de=S.parameters)==null?void 0:de.docs)==null?void 0:pe.description}}};var me,fe,he,ge,ve;L.parameters={...L.parameters,docs:{...(me=L.parameters)==null?void 0:me.docs,source:{originalSource:`{
  render: () => {
    function Demo() {
      const {
        openPanel
      } = usePanels();
      const [log, setLog] = useState<string[]>([]);
      return <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '1rem'
      }}>
          <Button variant="primary" onClick={() => openPanel('actions', <PanelContent title="Panel with Actions" />, 'Conversation', 'left', undefined, undefined, undefined, [{
          icon: 'fad fa-trash',
          label: 'Delete',
          onClick: () => setLog(l => [...l, 'Delete clicked'])
        }, {
          icon: 'fad fa-list',
          label: 'Logs',
          onClick: () => setLog(l => [...l, 'Logs clicked'])
        }])}>
            Open Panel with Action Icons
          </Button>
          {log.length > 0 && <div style={{
          color: '#93c5fd',
          fontSize: '0.8rem'
        }}>
              {log.slice(-3).map((e, i) => <div key={i}>{e}</div>)}
            </div>}
        </div>;
    }
    return <Demo />;
  }
}`,...(he=(fe=L.parameters)==null?void 0:fe.docs)==null?void 0:he.source},description:{story:"Panel with action icon buttons in the header",...(ve=(ge=L.parameters)==null?void 0:ge.docs)==null?void 0:ve.description}}};var Pe,ye,xe,je,Ce;I.parameters={...I.parameters,docs:{...(Pe=I.parameters)==null?void 0:Pe.docs,source:{originalSource:`{
  render: () => {
    function Demo() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
          <Button variant="primary" onClick={() => openPanel('fw', <PanelContent title="Full Width Panel" />, 'Full Width', 'center', undefined, undefined, true)}>
            Open Full-Width Panel
          </Button>
        </div>;
    }
    return <Demo />;
  }
}`,...(xe=(ye=I.parameters)==null?void 0:ye.docs)==null?void 0:xe.source},description:{story:"Full-width panel (covers entire viewport)",...(Ce=(je=I.parameters)==null?void 0:je.docs)==null?void 0:Ce.description}}};var be,ke,Be,we,Se;D.parameters={...D.parameters,docs:{...(be=D.parameters)==null?void 0:be.docs,source:{originalSource:`{
  render: () => {
    function InnerContent() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        padding: '1.5rem',
        color: '#e2e8f0'
      }}>
          <p style={{
          opacity: 0.7,
          marginBottom: '1rem'
        }}>This is panel one. Open a second panel on top.</p>
          <Button variant="primary" onClick={() => openPanel('panel2', <PanelContent title="Panel Two (stacked)" />, 'Panel Two', 'center', 'Stacked on top')}>
            Open Second Panel
          </Button>
        </div>;
    }
    function Demo() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
          <Button variant="primary" onClick={() => openPanel('panel1', <InnerContent />, 'Panel One', 'center')}>
            Open First Panel
          </Button>
        </div>;
    }
    return <Demo />;
  }
}`,...(Be=(ke=D.parameters)==null?void 0:ke.docs)==null?void 0:Be.source},description:{story:"Stacked panels — open a second panel from inside the first",...(Se=(we=D.parameters)==null?void 0:we.docs)==null?void 0:Se.description}}};var Le,Ie,De,Te,_e;T.parameters={...T.parameters,docs:{...(Le=T.parameters)==null?void 0:Le.docs,source:{originalSource:`{
  render: () => {
    function Level3Content() {
      return <PanelContent title="Level 3 — deepest panel" />;
    }
    function Level2Content() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        padding: '1.5rem',
        color: '#e2e8f0'
      }}>
          <p style={{
          opacity: 0.7,
          marginBottom: '1rem'
        }}>Level 2 panel.</p>
          <Button variant="primary" onClick={() => openPanel('p3', <Level3Content />, 'Level 3', 'left', 'Deepest')}>
            Open Level 3
          </Button>
        </div>;
    }
    function Level1Content() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        padding: '1.5rem',
        color: '#e2e8f0'
      }}>
          <p style={{
          opacity: 0.7,
          marginBottom: '1rem'
        }}>Level 1 panel.</p>
          <Button variant="primary" onClick={() => openPanel('p2', <Level2Content />, 'Level 2', 'left', 'Middle layer')}>
            Open Level 2
          </Button>
        </div>;
    }
    function Demo() {
      const {
        openPanel
      } = usePanels();
      return <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
          <Button variant="primary" onClick={() => openPanel('p1', <Level1Content />, 'Level 1', 'left')}>
            Open Level 1
          </Button>
        </div>;
    }
    return <Demo />;
  }
}`,...(De=(Ie=T.parameters)==null?void 0:Ie.docs)==null?void 0:De.source},description:{story:"Three levels deep",...(_e=(Te=T.parameters)==null?void 0:Te.docs)==null?void 0:_e.description}}};var Oe,We,Ae,Ne,ze;_.parameters={..._.parameters,docs:{...(Oe=_.parameters)==null?void 0:Oe.docs,source:{originalSource:`{
  render: () => {
    function Demo() {
      const {
        openPanel
      } = usePanels();
      const [log, setLog] = useState<string[]>([]);
      return <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '1rem'
      }}>
          <Button variant="primary" onClick={() => openPanel('ks', <PanelContent title="Full featured panel" />, 'Alice Johnson', 'left', 'Active now', '/profile/default-profile.jpg', false, [{
          icon: 'fad fa-trash',
          label: 'Delete conversation',
          onClick: () => setLog(l => [...l, 'Delete'])
        }, {
          icon: 'fad fa-list',
          label: 'View logs',
          onClick: () => setLog(l => [...l, 'Logs'])
        }])}>
            Open Kitchen Sink Panel
          </Button>
          {log.length > 0 && <div style={{
          color: '#93c5fd',
          fontSize: '0.8rem'
        }}>
              {log.slice(-3).map((e, i) => <div key={i}>{e}</div>)}
            </div>}
        </div>;
    }
    return <Demo />;
  }
}`,...(Ae=(We=_.parameters)==null?void 0:We.docs)==null?void 0:Ae.source},description:{story:"Full kitchen sink — profile image, subtitle, action icons, left title",...(ze=(Ne=_.parameters)==null?void 0:Ne.docs)==null?void 0:ze.description}}};var Fe,qe,Ee,Me,Re;O.parameters={...O.parameters,docs:{...(Fe=O.parameters)==null?void 0:Fe.docs,source:{originalSource:`{
  render: () => {
    function Demo() {
      const {
        openPanel,
        closeAllPanels
      } = usePanels();
      return <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
          <Button variant="primary" onClick={() => {
          openPanel('ca1', <PanelContent title="Panel One" />, 'Panel One');
          setTimeout(() => openPanel('ca2', <PanelContent title="Panel Two" />, 'Panel Two'), 350);
        }}>
            Open Two Panels
          </Button>
          <Button variant="danger" onClick={closeAllPanels}>
            Close All Panels
          </Button>
        </div>;
    }
    return <Demo />;
  }
}`,...(Ee=(qe=O.parameters)==null?void 0:qe.docs)==null?void 0:Ee.source},description:{story:"closeAllPanels — open two panels then close all at once",...(Re=(Me=O.parameters)==null?void 0:Me.docs)==null?void 0:Re.description}}};const qt=["Basic","TitleLeft","WithSubtitle","WithProfileImage","WithActionIcons","FullWidth","StackedPanels","ThreeLevelStack","KitchenSink","CloseAll"];export{k as Basic,O as CloseAll,I as FullWidth,_ as KitchenSink,D as StackedPanels,T as ThreeLevelStack,B as TitleLeft,L as WithActionIcons,S as WithProfileImage,w as WithSubtitle,qt as __namedExportsOrder,Ft as default};
