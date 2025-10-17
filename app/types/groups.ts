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
     * Special rights associated to that group for the user, only applicable to ACLs
     * @example ["ROLE_GROUP_LADMIN", "ROLE_DEVICE_READ"]
     */
    roles: string[];

    /**
     * children of that group
     */
    children: GroupsHierarchySimplified[];
}


export interface GroupCreationBody {
    /**
     * Name of the group to create
     * @example "My Devices"
     */
    name: string;

    /**
     * Description of the group
     * @example "My favorite Devices"
     */
    description: string;

    /**
     * ShortId of the parent group
     * @example "abC12Dfy"
     */
    parenId?: string;
}

