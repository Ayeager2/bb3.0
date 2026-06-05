import Card from "../shared/Card.jsx";
import BN4ReadinessView from "../views/BN4ReadinessView.jsx";

export default function BN4ReadinessCard(props) {
    return (
        <Card {...props} title="BN4 Readiness">
            <BN4ReadinessView state={props.state} />
        </Card>
    );
}