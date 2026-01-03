use std::time::SystemTime;

const RANDOM_TEXTS: [&str; 10] = [
    "The morning air felt unusually quiet as the city slowly woke up. A single bicycle passed by, its wheels humming softly against the road. Somewhere nearby, a shopkeeper lifted a shutter and sighed, ready for another long day.",
    "She found an old notebook hidden behind the bookshelf. The pages were filled with half-written ideas and strange sketches that made no sense at first. After a while, patterns began to emerge, and curiosity replaced confusion.",
    "Rain started falling without warning, tapping rapidly on the windows. People rushed for shelter while the streets turned reflective and slick. The storm passed as quickly as it arrived, leaving behind the smell of wet earth.",
    "He tried to focus on the screen, but his thoughts kept drifting away. Every notification felt louder than the last. Eventually, he shut everything down and sat in silence, realizing how rare that moment was.",
    "The train arrived late, as expected, but no one complained. Travelers stood patiently, scrolling through phones or staring into space. When the doors finally opened, the platform came alive with movement.",
    "A small café sat quietly at the corner of the street. Inside, conversations blended with the sound of grinding coffee beans. Time seemed slower there, as if the outside world had briefly paused.",
    "The dog waited by the door, tail wagging at every sound. It had learned to recognize footsteps long before they reached the house. When the door finally opened, excitement filled the room instantly.",
    "He stared at the blank page longer than he wanted to admit. Writing always felt harder before the first sentence appeared. Once it did, the rest followed more naturally than expected.",
    "The road stretched endlessly ahead, surrounded by open fields. Driving felt meditative, with nothing but the hum of the engine and the changing sky. Miles passed unnoticed until the sun dipped low.",
    "An old photograph slipped out of the book unexpectedly. It captured a moment no one remembered clearly anymore. Yet somehow, it still carried the weight of a shared past.",
];

pub fn get_random_text() -> &'static str {
    let index = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs() as usize
        % RANDOM_TEXTS.len();
    RANDOM_TEXTS[index]
}
