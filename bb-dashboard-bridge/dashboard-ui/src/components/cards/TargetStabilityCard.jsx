import Card from "../shared/Card.jsx";
import TargetStabilityView from "../views/TargetStabilityView.jsx";

export default function TargetStabilityCard(props) {
    return (
        <Card {...props} title="Target Stability">
            <TargetStabilityView state={props.state} />
        </Card>
    );
}