import Theme, {ThemeProvider} from "@jetbrains/ring-ui-built/components/global/theme";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Island, {Content, Header} from "@jetbrains/ring-ui-built/components/island/island";

export const App = () => {

    return (
        <ThemeProvider theme={Theme.DARK} className="flex h-full bg-(--ring-secondary-background-color)">
            <Island className="flex-1">
                <Header border>Header </Header>
                <Content>
                    <Button primary>
                        click me
                    </Button>
                </Content>
            </Island>
        </ThemeProvider>
    );
};
