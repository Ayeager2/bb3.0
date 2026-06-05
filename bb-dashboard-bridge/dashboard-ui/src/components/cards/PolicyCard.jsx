import Card from "../shared/Card.jsx";
import PolicyView from "../views/PolicyView.jsx";

export default function PolicyCard(props) {
    return (
        <Card {...props} title="Spending Policy">
            <PolicyView state={props.state} />
        </Card>
    );
}