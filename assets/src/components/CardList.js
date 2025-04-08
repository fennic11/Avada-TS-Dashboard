const CardList = ({ cards }) => {
    return (
        <div>
            {cards.map(card => (
                <div key={card.id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
                    <h3>{card.name}</h3>
                    <p>ID: {card.id}</p>
                    <a href={card.shortUrl} target="_blank" rel="noopener noreferrer">Mở trên Trello</a>
                </div>
            ))}
        </div>
    );
};

export default CardList;
