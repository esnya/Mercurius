import React from 'react';
import { Result } from '../elasticsearch';
export declare type Query = Record<string, any>;
export interface QueryProps {
    index: string;
    body: Record<string, any>;
    watch?: number;
}
export interface Props {
    result: Result;
    update: () => Promise<void>;
}
export declare function withESQueryProps(Component: React.ComponentType<Props>): React.ComponentClass<QueryProps>;
export declare function withESQuery<T = {}>(props: QueryProps): (Component: React.ComponentType<Props>) => React.ComponentType;
