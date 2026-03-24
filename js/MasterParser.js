export function masterParse(cleanResponse, formula) {
    const parts = cleanResponse.split(' ');
    
    // OBD-II responses usually start at index 2 (41 0C [A] [B] ...)
    const A = parseInt(parts[2], 16);
    const B = parseInt(parts[3], 16)||0;
    const C = parseInt(parts[4], 16)||0;
    const D = parseInt(parts[5], 16)||0;

    // Create a simple math environment
    // We replace the letters in the string with our actual numbers
    const finalFormula = formula
        .replace(/A/g, A)
        .replace(/B/g, B)
        .replace(/C/g, C)
        .replace(/D/g, D);

    // Use Function constructor instead of eval() for slightly better safety/speed
    try {
        return new Function(`return ${finalFormula}`)();
    } catch (e) {
        console.error("Formula error:", e);
        return null;
    }
}