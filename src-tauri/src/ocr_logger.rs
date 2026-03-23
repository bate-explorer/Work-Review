// OCR 日志保存模块
// 将每日 OCR 内容保存到文本文件，用于后续分析和总结
// 当前仅保留读取能力，供日志查看使用

use crate::error::Result;
use std::fs;
use std::path::{Path, PathBuf};

/// OCR 日志管理器
pub struct OcrLogger {
    /// 日志目录
    log_dir: PathBuf,
}

impl OcrLogger {
    /// 创建新的 OCR 日志管理器
    pub fn new(data_dir: &Path) -> Self {
        let log_dir = data_dir.join("ocr_logs");
        // 确保目录存在
        let _ = fs::create_dir_all(&log_dir);

        Self { log_dir }
    }

    /// 读取指定日期的 OCR 日志
    pub fn read_log(&self, date: &str) -> Result<String> {
        let log_file = self.log_dir.join(format!("{date}.txt"));
        if log_file.exists() {
            Ok(fs::read_to_string(log_file)?)
        } else {
            Ok(String::new())
        }
    }
}
