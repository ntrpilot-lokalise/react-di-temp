import { useMemo, useState } from "react";
import { DefaultModuleImplmentation, useDi } from "../useDi2";

export type SomeModuleDefinition = {
    someRequiredFunction: () => number;
    useProvidedHook: () => [string, (value: string) => void];
    useOverridableHook: () => [string, (value: string) => void];
}

export const useSomeModule = useDi<SomeModuleDefinition>;

const useDefaultOverridableHook = () => useState('This hasnt been overriden');

export const SomeTopLevelFeature = ({ show }: { show: () => void }) => {
    const { someRequiredFunction, useOverridableHook } = useSomeModule();

    const theNumber = useMemo(someRequiredFunction, [someRequiredFunction]);
    const [overridableValue] = useOverridableHook();

    return <>
        <h1>Not loading lazy import</h1>
        <div>The provided number: {theNumber}</div>
        <div>The overridable value: {overridableValue}</div>
        <div>The provided hook value: <a onClick={show}>SHOW</a></div>
    </>
}

const SomeLazyImportTest = () => {
    const { someRequiredFunction, useOverridableHook, useProvidedHook } = useSomeModule();

    const theNumber = useMemo(someRequiredFunction, [someRequiredFunction]);
    const [overridableValue] = useOverridableHook();
    const [providedValue] = useProvidedHook();

    return <>
        <h1>Showing lazy import</h1>
        <div>The provided number: {theNumber}</div>
        <div>The overridable value: {overridableValue}</div>
        <div>The provided hook value: {providedValue}</div>
    </>
}

export const SomeTopLevelComponent = () => {
    const [show, setShow] = useState(false);

    return (
        <DefaultModuleImplmentation<SomeModuleDefinition>
            useOverridableHook={useDefaultOverridableHook}
        >
            {!show ? <SomeTopLevelFeature show={() => setShow(true)}/> : <SomeLazyImportTest />}
        </DefaultModuleImplmentation>
    )
}