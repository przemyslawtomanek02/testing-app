describe('AdminFlow', () => {
  it('passes', () => {
    cy.visit('https://noppe.pl/admin')
    cy.get('#root input[placeholder="Username"]').click();
    cy.get('#root input[placeholder="Username"]').type('noppe');
    cy.get('#root input[placeholder="Password"]').click();
    cy.get('#root input[placeholder="Password"]').type('michal2003');
    cy.get('#root button.flex span').click();
    cy.get('#root nav.flex-grow button:nth-child(3) span.transition-opacity').click();
    cy.get('#root button:nth-child(4)').click();
    cy.get('#root button:nth-child(5) span.transition-opacity').click();
    cy.get('#root button:nth-child(7) span.transition-opacity').click();
    cy.get('#root button:nth-child(8) span.transition-opacity').click();
    cy.get('#root button:nth-child(1)').click();
    cy.get('#root div.border-t button:nth-child(2)').click();
    cy.get('#root nav.flex-grow button:nth-child(2)').click();
    cy.get('#root div.relative').click();
    cy.get('[name="dark-mode-toggle"]').uncheck();
    cy.get('#root span.flex').click();
    cy.get('[name="dark-mode-toggle"]').check();
    cy.get('#root button:nth-child(7) span.transition-opacity').click();
    cy.get('[name="test_name"]').click();
    cy.get('[name="test_name"]').type('test');
    cy.get('[name="questions.0.question"]').click();
    cy.get('[name="questions.0.question"]').type('test');
    cy.get('#root [name="questions.0.answers.0.text"]').click();
    cy.get('#root [name="questions.0.answers.0.text"]').type('test5');
    cy.get('#root [name="questions.0.answers.1.text"]').click();
    cy.get('#root [name="questions.0.answers.1.text"]').type('test5');
    cy.get('#root [name="questions.0.answers.2.text"]').click();
    cy.get('#root [name="questions.0.answers.2.text"]').type('tes7');
    cy.get('#root [name="questions.0.answers.1.text"]').click();
    cy.get('#root [name="questions.0.answers.1.text"]').click();
    cy.get('#root [name="questions.0.answers.1.text"]').clear();
    cy.get('#root [name="questions.0.answers.1.text"]').type('test9');
    cy.get('#root div.md\\:border-l').click();
    cy.get('[name="test_description"]').click();
    cy.get('[name="test_description"]').type('nie wiem');
    cy.get('#root label[for="test_description"]').click();
    cy.get('[name="test_description"]').click();
    cy.get('#root button.justify-center span').click();
    cy.get('#root nav.flex-grow button:nth-child(2)').click();
    cy.get('#root div.border-t button:nth-child(3) span.transition-opacity').click();
    cy.get('#root path[fill-rule="evenodd"]').click();
  });
})