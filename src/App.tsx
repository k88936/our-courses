import {useState} from "react";
import Theme, {ThemeProvider} from "@jetbrains/ring-ui-built/components/global/theme";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Group from "@jetbrains/ring-ui-built/components/group/group";
import Input from "@jetbrains/ring-ui-built/components/input/input";
import Island, {Content, Header} from "@jetbrains/ring-ui-built/components/island/island";
import Select, {type SelectItem} from "@jetbrains/ring-ui-built/components/select/select";
import Text from "@jetbrains/ring-ui-built/components/text/text";
import type {CoursePlan} from "@thu-info/lib/src/models/cr/cr";
import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import {availableCourses, initialStaging, pastTerms} from "./mock";

const propertyOptions: SelectItem[] = [
    {key: "all", label: "All properties"},
    ...Array.from(new Set(availableCourses.map(course => course.property))).map(property => ({
        key: property,
        label: property
    }))
];

export const App = () => {
    const [leftExpanded, setLeftExpanded] = useState(false);
    const [termFocus, setTermFocus] = useState(0);
    const [search, setSearch] = useState("");
    const [selectedProperty, setSelectedProperty] = useState<SelectItem>(propertyOptions[0]);
    const [staging] = useState<CoursePlan[]>(initialStaging);

    return (
        <ThemeProvider theme={Theme.DARK} className="h-full bg-(--ring-secondary-background-color)">
            <main className="flex h-full gap-3 p-3">
                <section className={`h-full ${leftExpanded ? "basis-5/12" : "basis-3/12"}`}>
                    <Island className="flex h-full flex-col">
                    <Header border>
                        <Group>
                            <Text>History</Text>
                            <Button
                                onClick={() => setLeftExpanded(!leftExpanded)}>{leftExpanded ? "Fold" : "Unfold"}</Button>
                        </Group>
                    </Header>
                    <Content className="flex-1 overflow-auto">
                    {leftExpanded ? (
                        <Group className="flex overflow-x-auto">
                            {pastTerms.map(term => (
                                <Island key={term.term} className="min-w-64">
                                    <Header border>
                                        <Text>{term.term}</Text>
                                    </Header>
                                    <Content
                                        className="flex flex-col">
                                        {/* TODO reimplement the cros list later */}
                                    </Content>
                                </Island>
                            ))}
                        </Group>
                    ) : (
                        <Group className="flex flex-1 flex-col">
                            <Group className="flex justify-between">
                                <Button
                                    onClick={() => setTermFocus((termFocus - 1 + pastTerms.length) % pastTerms.length)}>&lt; Prev</Button>
                                <Text>{pastTerms[termFocus].term}</Text>
                                <Button
                                    onClick={() => setTermFocus((termFocus + 1) % pastTerms.length)}>Next &gt;</Button>
                            </Group>
                            <Group>
                                {/* TODO reimplement the cros list later */}
                            </Group>
                        </Group>
                    )}
                    </Content>
                </Island>
                </section>

                <section className={`h-full ${leftExpanded ? "basis-3/12" : "basis-4/12"}`}>
                    <Island className="flex h-full flex-col">
                    <Header border>
                        <Text size="l">
                            Staging (Next Term)
                        </Text>
                    </Header>
                    <Content className="flex-1 overflow-auto">
                        {/* TODO reimplement the cros list later */}
                    </Content>
                    <Panel>
                        <Text>Total selected: {staging.length}</Text>
                    </Panel>
                </Island>
                </section>

                <section className={`h-full ${leftExpanded ? "basis-4/12" : "basis-5/12"}`}>
                    <Island className="flex h-full flex-col">
                    <Header border>
                        <Text>Catalog (Available & Recommended)</Text>
                    </Header>
                    <Content className="overflow-auto">
                        <Input
                            label="Search by name / id"
                            value={search}
                            onChange={event => setSearch(event.currentTarget.value)}
                            onClear={() => setSearch("")}
                        />
                        <Group className="flex">
                            <Select
                                data={propertyOptions}
                                selected={selectedProperty}
                                onSelect={option => option && setSelectedProperty(option)}
                                filter
                                label="Property"
                            />
                        </Group>

                    </Content>
                    <Content className="flex-1 overflow-auto">
                        <Group className="flex flex-col">
                            {/* TODO reimplement the cros list later */}
                        </Group>
                    </Content>
                </Island>
                </section>
            </main>
        </ThemeProvider>
    );
};
