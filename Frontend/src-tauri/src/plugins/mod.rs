//! 进程内插件插槽。
//!
//! 新插件实现 [`Plugin`]，再在 [`install`] 里注册一行。不加载动态库，因此 macOS、Windows、Linux 的行为一致。

use serde::Serialize;
use std::sync::Arc;

/// 插件信息，给设置页列出插槽。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginInfo {
    /// 稳定标识。
    pub id: String,
    /// 给作者看的名称。
    pub name: String,
}

/// 插件插槽。以后的远端仓库或模型实现这个 trait，不改命令层。
pub trait Plugin: Send + Sync {
    /// 稳定标识。
    fn id(&self) -> &'static str;
    /// 给作者看的名称。
    fn name(&self) -> &'static str;
}

/// 已注册的插件。
#[derive(Default)]
pub struct PluginHost {
    plugins: Vec<Arc<dyn Plugin>>,
}

impl PluginHost {
    /// 注册一个插件。同一个 `id` 再注册一次会覆盖旧的。
    ///
    /// * `plugin` - 插件实例。
    pub fn register(&mut self, plugin: Arc<dyn Plugin>) {
        self.plugins.retain(|item| item.id() != plugin.id());
        self.plugins.push(plugin);
    }

    /// 按注册顺序列出插件。
    ///
    /// 返回 id 和名称，不包含插件内部状态。
    pub fn list(&self) -> Vec<PluginInfo> {
        self.plugins
            .iter()
            .map(|plugin| PluginInfo {
                id: plugin.id().to_string(),
                name: plugin.name().to_string(),
            })
            .collect()
    }
}

/// 示例插槽。它不做业务，用来证明注册表能列出插件。
struct SamplePlugin;

impl Plugin for SamplePlugin {
    fn id(&self) -> &'static str {
        "sample"
    }

    fn name(&self) -> &'static str {
        "示例插槽"
    }
}

/// 装上随应用发布的插件。
///
/// 返回已经注册示例插槽的宿主。
pub fn install() -> PluginHost {
    let mut host = PluginHost::default();
    host.register(Arc::new(SamplePlugin));
    host
}
