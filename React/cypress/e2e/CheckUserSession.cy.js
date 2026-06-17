describe('template spec', () => {
  it('passes', () => {
    cy.visit('https://noppe.pl')
    cy.get('[name="login"]').click();
    cy.get('[name="login"]').type('noppe');
    cy.get('[name="password"]').type('michal2003');
    cy.get('#root div.text-center').click();
    cy.get('#login-form span').click();
    cy.get('[id^="headlessui-menu-button-"]').click()
    cy.get('[id^="headlessui-menu-button-"]').click()
    cy.get('[id^="headlessui-menu-button-"]').click()
    cy.contains('[role="menuitem"]', 'My Profile').click()
    cy.get('#root h2.font-bold').should('have.text', 'Testowa');
    cy.contains('h2', 'Testowa')
      .closest('.cursor-pointer')
      .click()
    
    cy.get('#root div:nth-child(1) > div.cursor-pointer > div.flex-1').click();
    cy.get('#root div:nth-child(1) > div.cursor-pointer > div.flex-1').click();
    cy.get('#root div:nth-child(2) > div.cursor-pointer > div.flex-1 > p.truncate').click();
    cy.get('#root div:nth-child(2) > div.cursor-pointer > div.flex-1 > p.truncate').click();
    cy.get('[id^="headlessui-menu-button-"]').click()
    cy.contains('[role="menuitem"]', 'Log out').click()
  })
})