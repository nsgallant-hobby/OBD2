export let HEADERS = {
    ecm : null
}

export function register_header(name, value){
    HEADERS[name] = value;
}

export function get_header(name){
    return HEADERS[name];
}