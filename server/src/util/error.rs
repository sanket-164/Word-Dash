pub fn already_in_room(room_name: String) -> String {
    format!(
        "You are already in a room: {}. Leave it before creating or joining a room.",
        room_name
    )
}

pub fn room_already_exists(room_name: String) -> String {
    format!(
        "Room '{}' already exists. Please choose a different name.",
        room_name
    )
}

pub fn room_is_full(room_name: String) -> String {
    format!(
        "Room '{}' is full. Please join a different room.",
        room_name
    )
}

pub fn room_not_found(room_name: String) -> String {
    format!(
        "Room '{}' not found. Please check the room name and try again.",
        room_name
    )
}

pub fn not_in_room() -> String {
    "You are not in a room. Please join a room to play.".to_string()
}
