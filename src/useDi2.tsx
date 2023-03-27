import Module from "module";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";

type DiFunction<Args extends any[], Ret> = (...args: Args) => Ret;

interface DiFunctionFactory<Args extends any[], Ret> {
    isDiFunctionFactory: true;
    (): Promise<DiFunction<Args, Ret>>;
}

// TODO - do better type for factory
export const lazyImplementation = <Args extends any[], Ret>(factory: () => Promise<{ default: DiFunction<Args, Ret> }>): DiFunctionFactory<Args, Ret> => {
    const factoryFunction: DiFunctionFactory<Args, Ret> = () => factory().then(module => module.default);
    factoryFunction.isDiFunctionFactory = true;

    return factoryFunction;
}

const isLazyDiFunction = (value: unknown): value is DiFunctionFactory<unknown[], unknown> =>
    (value as DiFunctionFactory<unknown[], unknown>).isDiFunctionFactory


type LazyImplementationResolution<Args extends any[], Ret> = 
    | { status: 'pending', promise: ReturnType<DiFunctionFactory<Args, Ret>> }
    | { status: 'resolved', promise: ReturnType<DiFunctionFactory<Args, Ret>>, value: DiFunction<Args, Ret>  }
    | { status: 'error', promise: ReturnType<DiFunctionFactory<Args, Ret>>, error?: any }


const lazyImplementationResolutionCache = new Map<DiFunctionFactory<any[], any>, LazyImplementationResolution<any[], any>>()

const onLazyImplentationResolved = <Args extends any[], Ret>(factory: DiFunctionFactory<Args, Ret>, promise: ReturnType<DiFunctionFactory<Args, Ret>>) => 
    (value: DiFunction<Args, Ret>) => lazyImplementationResolutionCache.set(factory, { status: 'resolved', promise, value });

const onLazyImplentationError = <Args extends any[], Ret>(factory: DiFunctionFactory<Args, Ret>, promise: ReturnType<DiFunctionFactory<Args, Ret>>) => 
    (error: any) => lazyImplementationResolutionCache.set(factory, { status: 'error', promise, error });

const initiliseResolver = <Args extends any[], Ret>(factory: DiFunctionFactory<Args, Ret>) => {
    const promise = factory();
    
    promise.then(
        onLazyImplentationResolved(factory, promise),
        onLazyImplentationError(factory, promise),
    );

    const resolver = { status: 'pending', promise } as const;
    lazyImplementationResolutionCache.set(factory, resolver);

    return resolver;
}


const diResolverProxyHandler: ProxyHandler<object> = {
    get(target, propertyKey, receiver) {

        // TODO - better error handling and DEV environment only....
        if (!Reflect.has(target, propertyKey)) {
            throw new Error('No provider for ' + propertyKey.toString());
        }

        const value = Reflect.get(target, propertyKey, receiver);

        if (!isLazyDiFunction(value)) {
            return value;
        }

        const resolver = lazyImplementationResolutionCache.get(value) ?? initiliseResolver(value);

        switch (resolver.status) {
            case 'pending':
                throw resolver.promise;

            case 'error':
                throw resolver.error;

            case 'resolved':
                return resolver.value;
        }
    },  
}

const moduleContainerContext = createContext<object>({});

type ModuleProvider<Module extends object> = { [K in keyof Module]?: Module[K] | DiFunction<any[], any> | DiFunctionFactory<any[], any> }

export const OverrideModuleImplmentation = <Module extends object>({ children, ...impl }:  PropsWithChildren<ModuleProvider<Module>>) => {
    const inheritedContainer = useContext(moduleContainerContext);
    const container = useMemo(() => ({ ...inheritedContainer, ...impl }), [inheritedContainer, impl]);

    return <moduleContainerContext.Provider value={container}>{children}</moduleContainerContext.Provider>
}

export const DefaultModuleImplmentation = <Module extends object>({ children, ...impl }:  PropsWithChildren<ModuleProvider<Module>>) => {
    const inheritedContainer = useContext(moduleContainerContext);
    const container = useMemo(() => ({ ...impl, ...inheritedContainer }), [inheritedContainer, impl]);

    return <moduleContainerContext.Provider value={container}>{children}</moduleContainerContext.Provider>
}

export const useDi = <Module extends object>(): Module => {
    const container = useContext(moduleContainerContext);
    return new Proxy(container, diResolverProxyHandler) as Module;
}