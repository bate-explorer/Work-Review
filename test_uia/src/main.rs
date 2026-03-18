use std::time::Instant;
use uiautomation::patterns::{UIValuePattern, UILegacyIAccessiblePattern};
use uiautomation::types::ControlType;
use uiautomation::UIAutomation;

fn main() {
    let t_start = Instant::now();
    let automation = UIAutomation::new().unwrap();
    let desktop = automation.get_root_element().unwrap();

    let chrome_matcher = automation
        .create_matcher()
        .from(desktop)
        .control_type(ControlType::Window)
        .timeout(2000);
    
    let windows = chrome_matcher.find_all().unwrap_or_default();
    let mut chrome_win = None;
    for win in windows {
        let name = win.get_name().unwrap_or_default();
        if name.contains("Google Chrome") {
            chrome_win = Some(win);
            break;
        }
    }

    if let Some(win) = chrome_win {
        if let Ok(walker) = automation.get_control_view_walker() {
            if let Ok(mut child1) = walker.get_first_child(&win) {
                loop {
                    println!("    Child 1: {:?} (Name: '{}', Class: '{}')", 
                        child1.get_control_type().unwrap_or(ControlType::Custom),
                        child1.get_name().unwrap_or_default(),
                        child1.get_classname().unwrap_or_default()
                    );
                    
                    if let Ok(mut child2) = walker.get_first_child(&child1) {
                        loop {
                            println!("        Child 2: {:?} (Name: '{}', Class: '{}')", 
                                child2.get_control_type().unwrap_or(ControlType::Custom),
                                child2.get_name().unwrap_or_default(),
                                child2.get_classname().unwrap_or_default()
                            );
                            
                            if let Ok(mut child3) = walker.get_first_child(&child2) {
                                loop {
                                     println!("            Child 3: {:?} (Name: '{}', Class: '{}')", 
                                        child3.get_control_type().unwrap_or(ControlType::Custom),
                                        child3.get_name().unwrap_or_default(),
                                        child3.get_classname().unwrap_or_default()
                                    );
                                    if walker.get_next_sibling(&child3).is_err() { break; }
                                    child3 = walker.get_next_sibling(&child3).unwrap();
                                }
                            }
                            
                            if walker.get_next_sibling(&child2).is_err() { break; }
                            child2 = walker.get_next_sibling(&child2).unwrap();
                        }
                    }
                    
                    if walker.get_next_sibling(&child1).is_err() { break; }
                    child1 = walker.get_next_sibling(&child1).unwrap();
                }
            }
        }
    }
}
