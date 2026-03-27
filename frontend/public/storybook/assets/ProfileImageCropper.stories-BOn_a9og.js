import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{f as l}from"./index-aA1Q6uWB.js";import{T as b}from"./ToastContext-CzD02iU9.js";import{T as h}from"./ThemeContext-VTc29vLE.js";import{P as k}from"./ProfileImageCropper-Cs1dWOFU.js";import"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";function x(){const e=document.createElement("canvas");e.width=400,e.height=400;const o=e.getContext("2d"),t=o.createRadialGradient(200,200,40,200,200,200);t.addColorStop(0,"#f97316"),t.addColorStop(.5,"#764ba2"),t.addColorStop(1,"#667eea"),o.fillStyle=t,o.fillRect(0,0,400,400),o.fillStyle="rgba(255,255,255,0.3)",o.font="bold 32px sans-serif",o.textAlign="center",o.fillText("Profile",200,210);const y=e.toDataURL("image/jpeg",.9),i=atob(y.split(",")[1]),c=new Uint8Array(i.length);for(let a=0;a<i.length;a++)c[a]=i.charCodeAt(a);return new File([c],"profile.jpg",{type:"image/jpeg"})}const C=x(),F={title:"Image/ProfileImageCropper",component:k,parameters:{layout:"fullscreen",docs:{description:{component:"Circular crop tool for profile photos. Supports drag-to-pan and zoom. Outputs a 400×400 JPG blob. Renders as a full-screen modal overlay."}}},tags:["autodocs"],decorators:[e=>r.jsx(h,{children:r.jsx(b,{children:r.jsx(e,{})})})]},n={args:{imageFile:C,onCropComplete:l(),onCancel:l(),isDark:!0},parameters:{backgrounds:{default:"dark"},docs:{story:{inline:!1,iframeHeight:600}}},decorators:[e=>(document.body.style.backgroundColor="#0f172a",r.jsx(e,{}))]},s={args:{imageFile:C,onCropComplete:l(),onCancel:l(),isDark:!1},parameters:{backgrounds:{default:"light"},docs:{story:{inline:!1,iframeHeight:600}}},decorators:[e=>(document.body.style.backgroundColor="#ffffff",r.jsx(e,{}))]};var d,m,f;n.parameters={...n.parameters,docs:{...(d=n.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    imageFile: testImage,
    onCropComplete: fn(),
    onCancel: fn(),
    isDark: true
  },
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      story: {
        inline: false,
        iframeHeight: 600
      }
    }
  },
  decorators: [Story => {
    document.body.style.backgroundColor = '#0f172a';
    return <Story />;
  }]
}`,...(f=(m=n.parameters)==null?void 0:m.docs)==null?void 0:f.source}}};var p,g,u;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    imageFile: testImage,
    onCropComplete: fn(),
    onCancel: fn(),
    isDark: false
  },
  parameters: {
    backgrounds: {
      default: 'light'
    },
    docs: {
      story: {
        inline: false,
        iframeHeight: 600
      }
    }
  },
  decorators: [Story => {
    document.body.style.backgroundColor = '#ffffff';
    return <Story />;
  }]
}`,...(u=(g=s.parameters)==null?void 0:g.docs)==null?void 0:u.source}}};const R=["Default","LightTheme"];export{n as Default,s as LightTheme,R as __namedExportsOrder,F as default};
