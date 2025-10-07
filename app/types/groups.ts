export interface GroupsHierarchySimplified {
    /**
     * short ID of the group
     * @example "HgbE5ErU"
     */
    shortId: string;

    /**
     * name of the group
     * @example "My devices"
     */
    name: string;

    /**
     * description of the group
     * @example "my favorite devices"
     */
    description: string;

    /**
     * children of that group
     */
    children: GroupsHierarchySimplified[];
}