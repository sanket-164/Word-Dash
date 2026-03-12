use std::time::SystemTime;

const RANDOM_TEXTS: [&str; 20] = [
    "Swift foxes jump over lazy dogs in a classic display of agility and speed.",
    "A sudden bolt of lightning illuminated the valley, followed by a deafening crash of thunder.",
    "The cat leaped onto the fence, balancing perfectly before vanishing into the shadows of the night.",
    "An old photograph slipped out of the book unexpectedly. It captured a moment no one remembered clearly anymore. Yet somehow, it still carried the weight of a shared past.",
    "He stared at the blank page longer than he wanted to admit. Writing always felt harder before the first sentence appeared. Once it did, the rest followed more naturally than expected.",
    "A small cafe sat quietly at the corner of the street. Inside, conversations blended with the sound of grinding coffee beans. Time seemed slower there, as if the outside world had briefly paused.",
    "The road stretched endlessly ahead, surrounded by open fields. Driving felt meditative, with nothing but the hum of the engine and the changing sky. Miles passed unnoticed until the sun dipped low.",
    "The dog waited by the door, tail wagging at every sound. It had learned to recognize footsteps long before they reached the house. When the door finally opened, excitement filled the room instantly.",
    "Neon lights flickered above the diner, casting a purple glow over the wet pavement. Inside, the smell of burnt toast and cheap coffee created a nostalgic atmosphere for those seeking refuge from the cold.",
    "The train arrived late, as expected, but no one complained. Travelers stood patiently, scrolling through phones or staring into space. When the doors finally opened, the platform came alive with movement.",
    "Compiling the source code took longer than expected, but the final binary was surprisingly small. Optimization is an art that requires patience and a deep understanding of memory management and CPU cycles.",
    "He tried to focus on the screen, but his thoughts kept drifting away. Every notification felt louder than the last. Eventually, he shut everything down and sat in silence, realizing how rare that moment was.",
    "He checked his watch for the fifth time in a minute. The meeting was supposed to start at noon, but the hallway remained eerily empty. Perhaps he had the wrong day, or perhaps everyone else knew something he didn't.",
    "Virtual reality offers a glimpse into worlds that exist only in code. Pixels transform into mountains, and algorithms simulate the feeling of gravity, blurring the line between what is tangible and what is merely imagined.",
    "The morning air felt unusually quiet as the city slowly woke up. A single bicycle passed by, its wheels humming softly against the road. Somewhere nearby, a shopkeeper lifted a shutter and sighed, ready for another long day.",
    "She found an old notebook hidden behind the bookshelf. The pages were filled with half-written ideas and strange sketches that made no sense at first. After a while, patterns began to emerge, and curiosity replaced confusion.",
    "Rain started falling without warning, tapping rapidly on the windows. People rushed for shelter while the streets turned reflective and slick. The storm passed as quickly as it arrived, leaving behind the smell of wet earth.",
    "The experiment required exactly 4.5 liters of solution, heated to 75 degrees Celsius. If the temperature dropped by even 2%, the entire reaction would fail, costing the team months of hard work and nearly $50,000 in lost materials. Precision wasn't just a goal; it was the only way to survive the rigorous demands of the laboratory environment.",
    "Waves crashed against the jagged rocks, sending salty spray high into the air. The ocean was restless today, churning with a deep green intensity that signaled a coming storm. Far out on the horizon, a single ship struggled against the rising tide, its mast swaying dangerously. It was a stark reminder of how small we really are compared to the vast, untamed power of the natural world, yet we keep sailing forward anyway.",
    "Deep in the forest, the ancient trees whispered secrets to the wind. Every rustle of a leaf felt like a syllable in a language forgotten by humans long ago. Explorers often came here seeking answers, but most left with only more questions and a strange sense of longing for a home they had never actually visited. It was a place where time didn't follow the usual rules, and the stars seemed much closer than they did in the crowded cities.",
];

pub fn get_random_text() -> &'static str {
    let index = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs() as usize
        % RANDOM_TEXTS.len();
    RANDOM_TEXTS[index]
}
