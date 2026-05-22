use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};

pub struct RestManager {
    // 跟踪当前是否有休息窗口正在显示
    is_resting: Arc<Mutex<bool>>,
}

impl RestManager {
    pub fn new() -> Self {
        Self {
            is_resting: Arc::new(Mutex::new(false)),
        }
    }

    // 启动后台轮询定时器
    pub fn start_loop(&self, app_handle: AppHandle) {
        let is_resting = self.is_resting.clone();
        
        tauri::async_runtime::spawn(async move {
            loop {
                // 1. 每隔一段时间读取一次最新的配置
                // 假设你有一个全局状态或能从 app_handle 获取 config
                let config = get_current_config(&app_handle); 
                
                if !config.enabled {
                    sleep(Duration::from_secs(5)).await;
                    continue;
                }

                // 2. 等待工作时长（例如 20 分钟）
                sleep(Duration::from_secs(config.work_duration_mins as u64 * 60)).await;

                // 再次检查中途用户是否关闭了该功能
                if !get_current_config(&app_handle).enabled {
                    continue;
                }

                // 3. 触发全屏休息
                let mut resting_lock = is_resting.lock().await;
                *resting_lock = true;

                // 在 Rust 中创建或显示绝对置顶的全屏窗口
                let app_handle_clone = app_handle.clone();
                let rest_secs = config.rest_duration_secs;
                
                tauri::async_runtime::spawn_blocking(move || {
                    trigger_rest_window(&app_handle_clone, rest_secs);
                });

                // 4. 等待休息时间结束（比如 20 秒）再进入下一个工作周期
                sleep(Duration::from_secs(config.rest_duration_secs as u64)).await;
                *resting_lock = false;
            }
        });
    }
}

// 创建一个坚不可摧的全屏置顶窗口
fn trigger_rest_window(app: &AppHandle, rest_duration: u32) {
    if let Some(existing_window) = app.get_webview_window("rest-overlay") {
        existing_window.show().unwrap();
        existing_window.set_focus().unwrap();
        // 传递倒计时给前端
        let _ = existing_window.emit("start-rest-countdown", rest_duration);
        return;
    }

    // 创建全新窗口：全屏、无边框、绝对置顶、不接受点击穿透（拦截所有操作）
    let win = WebviewWindowBuilder::new(
        app,
        "rest-overlay",
        WebviewUrl::App("#/rest-screen".into()) // 前端对应的专属全屏路由或页面
    )
    .title("Take a break")
    .fullscreen(true)          // 全屏
    .decorations(false)        // 无边框
    .always_on_top(true)       // 窗口最上层
    .visible(false)            // 先不显示，等初始化好
    .skip_taskbar(true)        // 任务栏不显示，防止用户右键关闭
    .build()
    .unwrap();

    // 严防死守：防止普通的 Alt+F4 或者特殊关闭指令（前端用 CSS 屏蔽常规点击）
    let win_clone = win.clone();
    win.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            // 强行拦截关闭请求，弹窗不能关闭
            api.prevent_close();
        }
    });

    win_clone.show().unwrap();
    win_clone.set_focus().unwrap();
    let _ = win_clone.emit("start-rest-countdown", rest_duration);
}

// 模拟获取配置的辅助函数
fn get_current_config(app: &AppHandle) -> RestReminderConfig {
    // 这里映射你项目现有的 config store 逻辑
    // 比如：app.state::<ConfigStore>().get()
    RestReminderConfig { enabled: true, work_duration_mins: 20, rest_duration_secs: 20 }
}
