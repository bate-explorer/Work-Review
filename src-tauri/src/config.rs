use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RestReminderConfig {
    pub enabled: bool,
    pub work_duration_mins: u32,  // 默认 20
    pub rest_duration_secs: u32,  // 默认 20
}

impl Default for RestReminderConfig {
    fn default() -> Self {
        Self {
            enabled: false, // 默认关闭，用户手动开启
            work_duration_mins: 20,
            rest_duration_secs: 20,
        }
    }
}

// 记得将 RestReminderConfig 组合进你的主 Config 结构体中
