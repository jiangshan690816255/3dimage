// node-functions/api/get-menu.js
// EdgeOne node-functions 强制固定导出 async onRequest(context)
export async function onRequest(context) {
  // context 包含请求、环境变量、路由参数等
  const { request, env } = context;

  // 模拟返回菜单数据，和你前端loadMenu要的结构一致
  const menuData = {
    firstMenu: [
      {
        name: "基础例题",
        secondMenu: [
          {
            title: "3D演示案例",
            image: "",
            answer: "",
            video: ""
          }
        ]
      }
    ]
  };

  // 返回标准JSON响应
  return Response.json(menuData);
}