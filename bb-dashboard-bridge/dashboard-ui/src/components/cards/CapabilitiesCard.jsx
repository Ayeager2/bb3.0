import Card from "../shared/Card.jsx";
import CapabilitiesView from "../views/CapabilitiesView.jsx";

export default function CapabilitiesCard(props) {
    return (
        <Card {...props} title="Capabilities">
            <CapabilitiesView state={props.state} />
        </Card>
    );
}