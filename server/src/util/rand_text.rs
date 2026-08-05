use std::time::SystemTime;

const RANDOM_TEXTS: [&str; 50] = [
    "Learning to type accurately is more valuable than typing at high speed.",
    "A gentle breeze carried the colorful leaves across the quiet street.",
    "Small daily improvements often lead to remarkable results over time.",
    "The curious student solved the challenging puzzle with careful thinking.",
    "Fresh coffee filled the room while everyone prepared for the meeting.",
    "Technology evolves rapidly, but strong fundamentals remain equally important.",
    "Every successful project begins with a clear plan and consistent effort.",
    "Bright stars covered the night sky as the travelers continued their journey.",
    "Practice with patience, stay focused, and celebrate every small achievement.",
    "Swift foxes jump over lazy dogs in a classic display of agility and speed.",
    "A sudden bolt of lightning illuminated the valley, followed by a deafening crash of thunder.",
    "The cat leaped onto the fence, balancing perfectly before vanishing into the shadows of the night.",
    "The garden gate creaked when she pushed it open. Stone steps led to a small porch where a gray cat slept in a patch of sun.",
    "After the meeting ended, he walked back to his desk and reviewed the notes. A few questions remained, but the main plan was clear.",
    "The harbor reflected the evening sky in soft shades of orange and pink. Boats rocked gently while ropes tapped against wooden posts.",
    "Late afternoon light crossed the desk in thin golden stripes. Papers waited in neat piles, and the pen lay ready beside an open notebook.",
    "The mountain trail narrowed as it climbed through pine trees. Hikers paused to drink water, check the map, and admire the wide view below.",
    "A narrow alley led to a courtyard full of potted plants. Someone had placed a small fountain near the wall, and water sparkled in the shade.",
    "Each morning, the baker arranged fresh loaves on the wooden shelf. The smell of warm bread drifted into the street and drew customers inside.",
    "A quiet train carried passengers through fields, tunnels, and sleeping towns. Some read novels, some watched the sky, and some simply rested.",
    "The market was busy with people moving between colorful stalls. Vendors called out prices while children pointed at sweets and bright balloons.",
    "The library was silent except for the faint sound of turning pages. A student sat near the window, taking careful notes from a thick blue book.",
    "The classroom projector hummed as slides changed one by one. Students copied the final diagram, and the teacher waited patiently for questions.",
    "The evening practice ended with a slow walk home. The air was cool, the streetlights were bright, and the sound of the game still echoed nearby.",
    "Snow began to fall quietly over the village, covering roofs and fences. Windows glowed with warm light, and footsteps left fresh marks along the road.",
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
    "A gentle breeze carried the scent of blooming flowers across the peaceful countryside while birds sang cheerful melodies, children laughed in the distance, and the golden sunlight painted every field with remarkable beauty.",
    "The morning air felt unusually quiet as the city slowly woke up. A single bicycle passed by, its wheels humming softly against the road. Somewhere nearby, a shopkeeper lifted a shutter and sighed, ready for another long day.",
    "She found an old notebook hidden behind the bookshelf. The pages were filled with half-written ideas and strange sketches that made no sense at first. After a while, patterns began to emerge, and curiosity replaced confusion.",
    "Rain started falling without warning, tapping rapidly on the windows. People rushed for shelter while the streets turned reflective and slick. The storm passed as quickly as it arrived, leaving behind the smell of wet earth.",
    "The experiment required exactly 4.5 liters of solution, heated to 75 degrees Celsius. If the temperature dropped by even 2%, the entire reaction would fail, costing the team months of hard work and nearly $50,000 in lost materials. Precision wasn't just a goal; it was the only way to survive the rigorous demands of the laboratory environment.",
    "Waves crashed against the jagged rocks, sending salty spray high into the air. The ocean was restless today, churning with a deep green intensity that signaled a coming storm. Far out on the horizon, a single ship struggled against the rising tide, its mast swaying dangerously. It was a stark reminder of how small we really are compared to the vast, untamed power of the natural world, yet we keep sailing forward anyway.",
    "Deep in the forest, the ancient trees whispered secrets to the wind. Every rustle of a leaf felt like a syllable in a language forgotten by humans long ago. Explorers often came here seeking answers, but most left with only more questions and a strange sense of longing for a home they had never actually visited. It was a place where time didn't follow the usual rules, and the stars seemed much closer than they did in the crowded cities.",
    "The lighthouse stood alone on the cliff, sending its beam across the dark water every few seconds. Below, waves struck the rocks and broke into white foam. The keeper climbed the narrow stairs, checked the lamp, and wrote a short note in the logbook, knowing that distant ships depended on that steady light. Before dawn, fog rolled in and made the horn sound again.",
    "The workshop smelled of sawdust and oil, and tools hung in careful rows along the wall. A carpenter measured each board twice, cut slowly, and sanded the edges until they were smooth. The finished chair sat near the window, waiting for a final coat of varnish before it could be delivered to the customer. It was simple work, but it required patience and attention.",
    "The observatory sat on a high plateau where the night sky seemed unusually clear. Astronomers checked their instruments, compared old charts, and waited for the clouds to move away. When the telescope finally pointed toward a faint comet, the room filled with quiet excitement and the soft tapping of keyboards. It was the kind of moment that reminded them why they loved science.",
    "The city market closed slowly as vendors folded their canopies and packed unsold fruit into wooden crates. The last bus arrived with a hiss of brakes, and a few tired passengers stepped into the square while pigeons scattered across the wet stones. Above the rooftops, the sky turned from gray to a deep evening blue.",
    "The research team gathered around the monitor as the final numbers appeared on the screen. After weeks of testing, the results were clearer than anyone had expected, and a relieved silence spread through the room. Someone laughed quietly, someone saved the file, and the project leader began writing the summary for the next morning. It was not the end of the work, but it was an important step forward.",
    "The old railway station had a high ceiling, tall windows, and a clock that never seemed to hurry. Travelers sat on wooden benches with suitcases at their feet, while announcements echoed softly overhead. Outside, the morning fog rested over the tracks, turning the signals into faint red and green shapes in the distance. A vendor pushed a small cart along the platform and called out coffee and pastries.",
    "The desert cooled quickly after sunset, and the sand turned from gold to silver under the rising moon. A small camp sat near the rocks, its fire sending sparks into the still air. The travelers shared bread, checked their maps, and spoke in low voices about the long journey that still waited beyond the dunes. Somewhere far away, a coyote cried once and then silence returned.",
];

pub fn get_random_text() -> &'static str {
    let index = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs() as usize
        % RANDOM_TEXTS.len();
    RANDOM_TEXTS[index]
}
