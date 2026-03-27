import{j as o}from"./jsx-runtime-D_zvdyIk.js";import{f as l}from"./index-aA1Q6uWB.js";import{T as b}from"./ToastContext-CzD02iU9.js";import{T as h}from"./ThemeContext-VTc29vLE.js";import{C as k}from"./CoverImageCropper-qhexYkzq.js";import"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";function x(){const e=document.createElement("canvas");e.width=800,e.height=400;const r=e.getContext("2d"),t=r.createLinearGradient(0,0,800,400);t.addColorStop(0,"#667eea"),t.addColorStop(.5,"#764ba2"),t.addColorStop(1,"#f97316"),r.fillStyle=t,r.fillRect(0,0,800,400),r.fillStyle="rgba(255,255,255,0.3)",r.font="bold 48px sans-serif",r.textAlign="center",r.fillText("Cover Preview",400,220);const y=e.toDataURL("image/jpeg",.9),c=atob(y.split(",")[1]),i=new Uint8Array(c.length);for(let a=0;a<c.length;a++)i[a]=c.charCodeAt(a);return new File([i],"cover.jpg",{type:"image/jpeg"})}const C=x(),R={title:"Image/CoverImageCropper",component:k,parameters:{layout:"fullscreen",docs:{description:{component:"Rectangular 16:9 crop tool for cover/banner images. Supports drag-to-pan and zoom. Outputs a 1200×630 JPG blob. Renders as a full-screen modal overlay."}}},tags:["autodocs"],decorators:[e=>o.jsx(h,{children:o.jsx(b,{children:o.jsx(e,{})})})]},n={args:{imageFile:C,onCropComplete:l(),onCancel:l(),isDark:!0},parameters:{backgrounds:{default:"dark"},docs:{story:{inline:!1,iframeHeight:550}}},decorators:[e=>(document.body.style.backgroundColor="#0f172a",o.jsx(e,{}))]},s={args:{imageFile:C,onCropComplete:l(),onCancel:l(),isDark:!1},parameters:{backgrounds:{default:"light"},docs:{story:{inline:!1,iframeHeight:550}}},decorators:[e=>(document.body.style.backgroundColor="#ffffff",o.jsx(e,{}))]};var d,m,f;n.parameters={...n.parameters,docs:{...(d=n.parameters)==null?void 0:d.docs,source:{originalSource:`{
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
        iframeHeight: 550
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
        iframeHeight: 550
      }
    }
  },
  decorators: [Story => {
    document.body.style.backgroundColor = '#ffffff';
    return <Story />;
  }]
}`,...(u=(g=s.parameters)==null?void 0:g.docs)==null?void 0:u.source}}};const w=["Default","LightTheme"];export{n as Default,s as LightTheme,w as __namedExportsOrder,R as default};
