import Card from "../shared/Card.jsx";
import TargetIntelView from "../views/TargetIntelView.jsx";

export default function TargetIntelCard(props) {
    return (
        <Card {...props} title="Target Intel">
            <TargetIntelView state={props.state} />
        </Card>
    );
}