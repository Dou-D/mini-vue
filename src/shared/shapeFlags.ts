/**
 * ELEMENT - 0001  
 * STATEFUL_COMPONENT - 0010  
 * TEXT_CHILDREN - 0100  
 * ARRAY_CHILDREN - 1000
 */
export const enum ShapeFlags {
    ELEMENT = 1,
    STATEFUL_COMPONENT = 1 << 1, 
    TEXT_CHILDREN = 1 << 2, 
    ARRAY_CHILDREN = 1 << 3,
    SLOT_CHILDREN = 1 << 4
}